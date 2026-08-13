/**
 * useSpeechHistory.js
 * Custom hook that manages speech history, favorites, and localStorage persistence.
 * Drop this into src/hooks/useSpeechHistory.js in the VoiceForge project.
 */

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "../utils/auth.js";

const HISTORY_KEY = "vf_history";
const FAVS_KEY = "vf_favorites";
const TRANSCRIPT_KEY = "vf_transcript";
const MAX_HISTORY = 25;
const MAX_ANALYTICS = 2000;

function generateUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

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

export function useSpeechHistory() {
  // ── State ────────────────────────────────────────────────────────────────
  const [history, setHistory] = useState(() => readStorage(HISTORY_KEY, []));
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

  useEffect(() => {
    async function syncSpeechHistory() {
      try {
        const res = await fetch("/api/speech-history");
        if (res.ok) {
          const remoteHistory = await res.json();
          setHistory((prev) => {
            const mergedMap = new Map();
            prev.forEach(item => mergedMap.set(item.id, item));
            remoteHistory.forEach(remote => {
              const localMatch = prev.find(p => p.id === remote.id || p.text === remote.text);
              const mergedItem = {
                id: remote.id,
                text: remote.text,
                timestamp: remote.timestamp,
                language: remote.language_code || "en-US",
                tags: localMatch ? (localMatch.tags || []) : []
              };
              if (remote.is_favorite) {
                setFavorites(prevFavs => {
                  const next = new Set(prevFavs);
                  next.add(remote.id);
                  return next;
                });
              }
              mergedMap.set(remote.id, mergedItem);
            });

            const sorted = Array.from(mergedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
            return sorted.slice(0, MAX_HISTORY);
          });
        }
      } catch (err) {
        console.error("Failed to sync speech history:", err);
      }
    }
    syncSpeechHistory();
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
 */
const addMessage = useCallback((text, voiceId = "", sessionId = "") => {
  const trimmed = text.trim();

  if (!trimmed) return;

  const timestamp = Date.now();

  setSessionTranscript((prev) => [
    ...prev,
    { text: trimmed, timestamp },
  ]);

  // Save to IndexedDB transcripts store for Phase 3 & 4
  saveTranscript({
    text: trimmed,
    voice_id: voiceId,
    session_id: sessionId,
    timestamp
  }).catch((err) => console.error("Error saving transcript to IndexedDB:", err));

  setHistory((prev) => {
    const existing = prev.find((m) => m.text === trimmed);

    // Fixed duplicate declaration syntax error
    const entry = existing
      ? { ...existing, timestamp }
      : { id: crypto.randomUUID(), text: trimmed, timestamp };

    // Sync to backend database
    authFetch("/api/speech-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: updatedEntry.id,
        text: updatedEntry.text,
        language_code: lang,
        timestamp: updatedEntry.timestamp,
        is_favorite: favorites.has(updatedEntry.id) ? 1 : 0
      })
    }).catch(err => console.error("Failed to save speech log:", err));

    // Sync to backend database
    fetch("/api/speech-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: updatedEntry.id,
        text: updatedEntry.text,
        language_code: lang,
        timestamp: updatedEntry.timestamp,
        is_favorite: favorites.has(updatedEntry.id) ? 1 : 0
      })
    }).catch(err => console.error("Failed to save speech log:", err));

    const updated = [
      entry,
      ...prev.filter((m) => m.id !== entry.id),
    ];

    return updated.slice(0, MAX_HISTORY);
  });
}, [favorites]);

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
    fetch(`/api/speech-history/${id}`, {
      method: "DELETE"
    }).catch(err => console.error("Failed to delete speech log:", err));
  }, []);

  /**
   * Pins or unpins a message.
   */
  const toggleFavorite = useCallback((id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      const isFav = next.has(id);
      isFav ? next.delete(id) : next.add(id);

      const msg = history.find(m => m.id === id);
      if (msg) {
        fetch("/api/speech-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: msg.id,
            text: msg.text,
            language_code: msg.language || "en-US",
            timestamp: msg.timestamp,
            is_favorite: !isFav ? 1 : 0
          })
        }).catch(err => console.error("Failed to toggle favorite:", err));
      }

      return next;
    });
  }, [history]);

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
    archiveOldHistory,
    importBackup,
  };
}