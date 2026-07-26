/**
 * useSpeechHistory.js
 * Custom hook that manages speech history, favorites, and localStorage persistence.
 * Drop this into src/hooks/useSpeechHistory.js in the VoiceForge project.
 */

import { useState, useEffect, useCallback } from "react";

const HISTORY_KEY = "vf_history";
const FAVS_KEY = "vf_favorites";
const TRANSCRIPT_KEY = "vf_transcript";
const ANALYTICS_KEY = "vf_analytics_history";
const MAX_HISTORY = 25;
const MAX_ANALYTICS = 2000;

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

/**
 * Prunes history based on the retention policy and favorite status.
 */
export function pruneHistory(historyList, favoritesList, policy) {
  if (!policy || policy === "forever" || policy === "session") {
    return historyList;
  }

  const now = Date.now();
  let maxAgeMs = 0;
  if (policy === "7days") {
    maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  } else if (policy === "30days") {
    maxAgeMs = 30 * 24 * 60 * 60 * 1000;
  } else {
    return historyList;
  }

  const cutoff = now - maxAgeMs;
  const favSet = new Set(favoritesList);

  return historyList.filter((item) => favSet.has(item.id) || item.timestamp >= cutoff);
}

export function useSpeechHistory() {
  // ── State ────────────────────────────────────────────────────────────────
  const [history, setHistory] = useState(() => {
    let raw = readStorage(HISTORY_KEY, []);
    const favs = readStorage(FAVS_KEY, []);
    const policy = localStorage.getItem("vf_history_retention") || "forever";
    const favSet = new Set(favs);

    // 1. Session check: if session is new and policy is "session", clear non-pinned
    const isNewSession = !sessionStorage.getItem("vf_session_active");
    if (isNewSession) {
      sessionStorage.setItem("vf_session_active", "true");
      if (policy === "session") {
        raw = raw.filter((item) => favSet.has(item.id));
      }
    }

    // 2. Duration check: prune items older than 7 or 30 days
    const pruned = pruneHistory(raw, favs, policy);

    return pruned.map((item) => ({
      ...item,
      tags: Array.isArray(item.tags) ? item.tags : [],
    }));
  });
  const [favorites, setFavorites] = useState(
    () => new Set(readStorage(FAVS_KEY, []))
  );
  const [sessionTranscript, setSessionTranscript] = useState(() => readSessionStorage(TRANSCRIPT_KEY, []));
  const [analyticsHistory, setAnalyticsHistory] = useState(() => readStorage(ANALYTICS_KEY, []));

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

  useEffect(() => {
    try {
      localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analyticsHistory));
    } catch {
      /* storage quota exceeded — silently skip */
    }
  }, [analyticsHistory]);

  // ── Retention Policy Effect ──────────────────────────────────────────────
  useEffect(() => {
    const handlePolicyChange = () => {
      const policy = localStorage.getItem("vf_history_retention") || "forever";
      if (policy === "forever" || policy === "session") return;

      setHistory((prev) => {
        const favs = readStorage(FAVS_KEY, []);
        return pruneHistory(prev, favs, policy);
      });
    };

    window.addEventListener("voiceforge:retentionPolicyChanged", handlePolicyChange);
    return () => {
      window.removeEventListener("voiceforge:retentionPolicyChanged", handlePolicyChange);
    };
  }, []);

  useEffect(() => {
    const handleUnload = () => {
      const policy = localStorage.getItem("vf_history_retention") || "forever";
      if (policy === "session") {
        const rawHistory = readStorage(HISTORY_KEY, []);
        const favs = readStorage(FAVS_KEY, []);
        const favSet = new Set(favs);
        const pruned = rawHistory.filter((item) => favSet.has(item.id));
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(pruned));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

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
   * @param {string} lang - Language code
   */
const addMessage = useCallback((text, lang = "en-US") => {
  const trimmed = text.trim();

  if (!trimmed) return;

  const timestamp = Date.now();

  setSessionTranscript((prev) => [
  ...prev,
  {
    text: trimmed,
    timestamp,
    status: "success",
    language: lang,
  },
]);

  setAnalyticsHistory((prev) => {
    const newEntry = { id: crypto.randomUUID(), text: trimmed, timestamp, language: lang };
    const updated = [newEntry, ...prev];
    return updated.slice(0, MAX_ANALYTICS);
  });

  setHistory((prev) => {
    // Check existing message
    const existing = prev.find((m) => m.text === trimmed);

    // Preserve existing ID if duplicate found, but update timestamp
    // so re-spoken messages sort correctly after a page reload.
    const updatedEntry = existing
      ? { ...existing, timestamp: Date.now(), tags: Array.isArray(existing.tags) ? existing.tags : [] }
      : { id: crypto.randomUUID(), text: trimmed, timestamp: Date.now(), tags: [] };

    // Move duplicate to top instead of recreating
    const updated = [
      updatedEntry,
      ...prev.filter((m) => m.id !== updatedEntry.id),
    ];

    return updated.slice(0, MAX_HISTORY);
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
    setSessionTranscript([]);
    setAnalyticsHistory([]);
  }, []);

  /**
   * Imports a history and favorites backup.
   * Merges imported items with the existing setup, preventing text duplicates
   * and updating favorite relationships.
   */
  const importBackup = useCallback((importedHistory, importedFavorites) => {
    const mergedMap = new Map();
    // Add existing history
    history.forEach(m => mergedMap.set(m.text, m));

    const favIdsToAdd = [];
    importedHistory.forEach((impMsg) => {
      const isImportedFav = importedFavorites.includes(impMsg.id);
      if (mergedMap.has(impMsg.text)) {
        const existingMsg = mergedMap.get(impMsg.text);
        if (isImportedFav) {
          favIdsToAdd.push(existingMsg.id);
        }
      } else {
        mergedMap.set(impMsg.text, impMsg);
        if (isImportedFav) {
          favIdsToAdd.push(impMsg.id);
        }
      }
    });

    const mergedList = Array.from(mergedMap.values());
    mergedList.sort((a, b) => b.timestamp - a.timestamp);
    const finalHistory = mergedList.slice(0, MAX_HISTORY);

    const nextFavorites = new Set(favorites);
    favIdsToAdd.forEach(id => nextFavorites.add(id));

    // Clean up favorites: only keep favorites whose IDs are in the finalHistory
    const finalHistoryIds = new Set(finalHistory.map(m => m.id));
    const cleanedFavorites = new Set();
    nextFavorites.forEach(id => {
      if (finalHistoryIds.has(id)) {
        cleanedFavorites.add(id);
      }
    });

    setHistory(finalHistory);
    setFavorites(cleanedFavorites);
  }, [history, favorites]);

  return {
    history,
    favorites,
    sessionTranscript,
    analyticsHistory,
    addMessage,
    removeMessage,
    toggleFavorite,
    clearHistory,
    importBackup,
  };
}
