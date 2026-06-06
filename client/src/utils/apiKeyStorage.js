/**
 * Central helpers for reading and writing the ElevenLabs API key.
 *
 * We use sessionStorage (not localStorage) intentionally:
 *   - Cleared automatically when the tab/window closes — limits credential exposure.
 *   - Not shared across tabs — each tab must re-enter the key, which is a
 *     deliberate security trade-off. A future "remember key" opt-in can be
 *     added here without touching call sites.
 *
 * Note: sessionStorage is still readable by same-origin JS during the session,
 * so it does not fully protect against XSS. Moving ElevenLabs calls to the
 * backend (where the key lives in a server-side .env) is the recommended
 * long-term fix (tracked separately).
 */

const KEY = "voiceforge:elevenlabsApiKey";

export function getApiKey() {
  try {
    return sessionStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function setApiKey(value) {
  try {
    sessionStorage.setItem(KEY, (value ?? "").trim());
  } catch {
    // Storage unavailable (e.g. private-browsing quota exceeded)
  }
}


export function clearApiKey() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function hasApiKey() {
  return Boolean(getApiKey().trim());
}

export function migrateFromLocalStorage() {
  try {
    const legacy = localStorage.getItem(KEY);
    if (legacy?.trim()) {
      sessionStorage.setItem(KEY, legacy.trim());
      localStorage.removeItem(KEY);
      return true;
    }
    if (legacy !== null) localStorage.removeItem(KEY);
  } catch {}
  return false;
}

