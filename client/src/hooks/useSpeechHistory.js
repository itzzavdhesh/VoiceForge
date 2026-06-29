/**
 * useSpeechHistory.js
 * Custom hook that manages speech history, favorites, and localStorage persistence.
 * Drop this into src/hooks/useSpeechHistory.js in the VoiceForge project.
 */

import { useState, useEffect, useCallback, useRef } from "react";

const HISTORY_KEY = "vf_history";
const FAVS_KEY = "vf_favorites";
const TRANSCRIPT_KEY = "vf_transcript";
const MAX_HISTORY = 25;
// Favorites are exempt from MAX_HISTORY eviction (see
// trimHistoryPreservingFavorites below), so without a separate ceiling here
// `history` could grow without bound under heavy pinning, risking a silent
// localStorage quota failure. Cap favorites independently to keep total
// persisted size bounded; this is also a sane UX limit on its own.
const MAX_FAVORITES = 50;

/**
 * Safely reads a JSON value from localStorage.
 * Returns `fallback` if the key is missing or the value is unparseable.
 */
function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);

    // Ensure correct structure
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : fallback;
    }

    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Safely reads a JSON value from sessionStorage.
 * Returns `fallback` if the key is missing or the value is unparseable.
 */
function readSessionStorage(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);

    // Ensure correct structure
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : fallback;
    }

    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}
/**
 * Trims a history array down to MAX_HISTORY entries, but exempts favorited
 * (pinned) entries from eviction. Only non-favorited entries count against
 * the cap, so pinning a message protects it indefinitely until unpinned.
 *
 * @param {Array<{id: string}>} entries - History entries, most-recent-first.
 * @param {Set<string>} favoriteIds - Ids currently pinned.
 * @param {number} maxHistory - Max number of non-favorited entries to keep.
 * @returns {Array<{id: string}>} The trimmed entries, original order preserved.
 */
export function trimHistoryPreservingFavorites(entries, favoriteIds, maxHistory) {
  const pinned = entries.filter((m) => favoriteIds.has(m.id));
  const unpinned = entries.filter((m) => !favoriteIds.has(m.id));
  // Favorites are exempt from the cap entirely — they must not reduce the
  // number of unpinned entries kept. maxHistory unpinned entries are kept
  // regardless of how many favorites exist on top of them.
  const trimmedUnpinned = unpinned.slice(0, maxHistory);

  const keptIds = new Set([
    ...pinned.map((m) => m.id),
    ...trimmedUnpinned.map((m) => m.id),
  ]);
  return entries.filter((m) => keptIds.has(m.id));
}

/**
 * Drops favorite ids that have no matching entry in history. Orphaned ids
 * can accumulate from prior bugs (e.g. a history entry was evicted while
 * still favorited, before favorites were exempted from eviction) or from
 * a history entry being deleted outright via removeMessage. Left unchecked,
 * an orphaned id permanently occupies a slot toward MAX_FAVORITES even
 * though it no longer corresponds to anything the user can see or unpin.
 *
 * @param {Iterable<string>} favoriteIds
 * @param {Array<{id: string}>} historyEntries
 * @returns {Set<string>}
 */
export function reconcileFavoritesWithHistory(favoriteIds, historyEntries) {
  const validIds = new Set(historyEntries.map((m) => m.id));
  return new Set([...favoriteIds].filter((id) => validIds.has(id)));
}

/**
 * Clamps a favorites collection down to maxFavorites, keeping the most
 * recently pinned ids. Used when loading favorites from localStorage,
 * where a legacy or otherwise oversized set (e.g. from before this cap
 * existed, or orphaned ids accumulated under the earlier eviction bug)
 * could exceed the cap and silently block all new pins.
 *
 * Ids are persisted in Set insertion order (oldest-pinned-first), so the
 * most recently pinned ids are the trailing entries of the input.
 *
 * @param {Iterable<string>} ids
 * @param {number} maxFavorites
 * @returns {Set<string>}
 */
export function clampFavorites(ids, maxFavorites) {
  const list = [...ids];
  const kept = maxFavorites > 0 ? list.slice(-maxFavorites) : [];
  return new Set(kept);
}

/**
 * Computes the next favorites Set for a pin/unpin toggle, enforcing
 * MAX_FAVORITES on new pins. Unpinning always succeeds. Pinning is refused
 * (the Set is returned unchanged) once the cap is reached, since favorited
 * entries are exempt from history eviction and would otherwise let
 * persisted `history` grow without bound.
 *
 * @param {Set<string>} currentFavorites
 * @param {string} id
 * @param {number} maxFavorites
 * @returns {{ favorites: Set<string>, applied: boolean }} The resulting Set
 *   and whether the toggle was applied (false only when a pin was refused).
 */
export function toggleFavoriteWithCap(currentFavorites, id, maxFavorites) {
  const next = new Set(currentFavorites);
  if (next.has(id)) {
    next.delete(id);
    return { favorites: next, applied: true };
  }
  if (next.size >= maxFavorites) {
    return { favorites: currentFavorites, applied: false };
  }
  next.add(id);
  return { favorites: next, applied: true };
}

/**
 * Manages speech history and pinned favorites.
 * Persists history and favorite IDs to localStorage.
 *
 * Features:
 * - duplicate prevention
 * - favorite persistence
 * - capped history size
 * - safe storage parsing
 *
 * @returns {Object} Speech history state and actions
 */

export function useSpeechHistory() {
  // ── State ────────────────────────────────────────────────────────────────
  const [history, setHistory] = useState(() => readStorage(HISTORY_KEY, []));
  const [favorites, setFavorites] = useState(() => {
    const loadedHistory = readStorage(HISTORY_KEY, []);
    const loadedFavoriteIds = readStorage(FAVS_KEY, []);
    const reconciled = reconcileFavoritesWithHistory(loadedFavoriteIds, loadedHistory);
    return clampFavorites(reconciled, MAX_FAVORITES);
  });
  const [sessionTranscript, setSessionTranscript] = useState(() => readSessionStorage(TRANSCRIPT_KEY, []));

  // Mirrors `favorites` so addMessage can read the latest pinned ids
  // without depending on `favorites` state (keeps addMessage's identity stable).
  const favoritesRef = useRef(favorites);
  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  // ── Persistence ──────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      /* storage quota exceeded — silently skip */
    }
  }, [history]);

  useEffect(() => {
    try {
      sessionStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(sessionTranscript));
    } catch {
      /* storage quota exceeded — silently skip */
    }
  }, [sessionTranscript]);

  useEffect(() => {
    try {
      localStorage.setItem(FAVS_KEY, JSON.stringify([...favorites]));
    } catch {
      /* storage quota exceeded — silently skip */
    }
  }, [favorites]);

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
 * Adds a message to speech history.
 *
 * Behavior:
 * - trims whitespace
 * - prevents empty messages
 * - preserves existing IDs for duplicates
 * - moves duplicate entries to top
 * - enforces MAX_HISTORY limit on non-favorited entries only;
 *   pinned/favorited messages are exempt from eviction
 *
 * @param {string} text - Message text to store
 */
const addMessage = useCallback((text) => {
  const trimmed = text.trim();

  if (!trimmed) return;

  const timestamp = Date.now();

  setSessionTranscript((prev) => [
    ...prev,
    { text: trimmed, timestamp, status: "success" },
  ]);

  setHistory((prev) => {
    // Check existing message
    const existing = prev.find((m) => m.text === trimmed);

    // Preserve existing ID if duplicate found, but update timestamp
    // so re-spoken messages sort correctly after a page reload.
    const updatedEntry = existing
      ? { ...existing, timestamp: Date.now() }
      : { id: crypto.randomUUID(), text: trimmed, timestamp: Date.now() };

    // Move duplicate to top instead of recreating
    const updated = [
      updatedEntry,
      ...prev.filter((m) => m.id !== updatedEntry.id),
    ];

    // Fix: pinned/favorited messages must never be evicted by the history
    // cap. Previously this was a blind `updated.slice(0, MAX_HISTORY)`,
    // which could silently drop a favorited entry once 25 newer messages
    // pushed it past the cutoff — removing it from "Pinned phrases" with
    // no warning, while its id stayed orphaned in `favorites` forever.
    //
    // Instead: keep every favorited entry regardless of position, and only
    // trim the *non-favorited* entries so the list still stays bounded.
    return trimHistoryPreservingFavorites(updated, favoritesRef.current, MAX_HISTORY);
  });
}, []);

  /**
   * Removes a message by id and also removes it from favorites.
   */
  const removeMessage = useCallback((id) => {
    setHistory((prev) => prev.filter((m) => m.id !== id));
    setFavorites((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  /**
   * Pins or unpins a message. Unpinning always succeeds. Pinning is
   * refused once MAX_FAVORITES is reached, to keep persisted storage
   * bounded (favorited entries are exempt from history eviction, so an
   * unbounded number of favorites would mean an unbounded `history` size).
   *
   * Computes the result up front from `favoritesRef.current`, then updates
   * both the ref (synchronously, right here) and React state. Updating the
   * ref synchronously — rather than waiting for the `favorites` sync effect
   * — means a second call to `toggleFavorite` made before the next render
   * (e.g. a rapid double-tap) still sees the just-applied change instead of
   * a stale snapshot, without relying on React's internal eager-update
   * optimization to make a mutated-closure-variable return value reliable.
   *
   * @param {string} id
   * @returns {boolean} false only when pinning was refused due to the cap;
   *   true for every successful pin/unpin.
   */
  const toggleFavorite = useCallback((id) => {
    const { favorites: next, applied } = toggleFavoriteWithCap(
      favoritesRef.current,
      id,
      MAX_FAVORITES
    );
    favoritesRef.current = next;
    setFavorites(next);
    return applied;
  }, []);

  /**
   * Wipes all history and favorites.
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setFavorites(new Set());
    setSessionTranscript([]);
  }, []);

  return {
    history,
    favorites,
    sessionTranscript,
    addMessage,
    removeMessage,
    toggleFavorite,
    clearHistory,
  };
}
