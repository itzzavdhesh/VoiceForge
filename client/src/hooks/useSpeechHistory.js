/**
 * useSpeechHistory.js
 * Custom hook that manages speech history, favorites, and localStorage persistence.
 * Drop this into src/hooks/useSpeechHistory.js in the VoiceForge project.
 */

import { useState, useEffect, useCallback } from "react";

const HISTORY_KEY = "vf_history";
const FAVS_KEY = "vf_favorites";
const MAX_HISTORY = 25;

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
  const [favorites, setFavorites] = useState(
    () => new Set(readStorage(FAVS_KEY, []))
  );

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
 * - enforces MAX_HISTORY limit
 *
 * @param {string} text - Message text to store
 * @param {string} [id] - Optional stable id to assign to this entry
 */
  const addMessage = useCallback((text, id) => {
  const trimmed = text.trim();
  if (!trimmed) return;

  const entryId = id || crypto.randomUUID();
  const existing = history.find((m) => m.text === trimmed);
  const resolvedId = existing ? existing.id : entryId;

  setHistory((prev) => {
    const found = prev.find((m) => m.text === trimmed);
    const entry = found || { id: entryId, text: trimmed, timestamp: Date.now() };
    const updated = [entry, ...prev.filter((m) => m.id !== entry.id)];
    return updated.slice(0, MAX_HISTORY);
  });

  return resolvedId;
}, [history]);

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
   * Pins or unpins a message.
   */
  const toggleFavorite = useCallback((id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  /**
   * Wipes all history and favorites.
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setFavorites(new Set());
  }, []);

  return {
    history,
    favorites,
    addMessage,
    removeMessage,
    toggleFavorite,
    clearHistory,
  };
}