// Shared voice-settings helpers used by Onboarding, Settings, VoiceQuickSettings, and useTTS.
//
// Single source of truth for:
//   - the localStorage key
//   - the default/fallback values
//   - the sanitized loader (type-checks and clamps every field)
//   - the persister (safely stringifies to localStorage)

export const VOICE_SETTINGS_KEY = "voiceforge:voiceSettings";

export const VOICE_SETTINGS_BOUNDS = {
  stability: { min: 0, max: 1 },
  style: { min: 0, max: 2 },
  temperature: { min: 0.05, max: 5 },
};

/**
 * Canonical defaults for every Chatterbox voice-settings field.
 * Components that only surface a subset of these sliders still load the full
 * object so their writes never drop unknown fields from storage.
 */
export const DEFAULT_VOICE_SETTINGS = {
  stability: 0.45,
  style: 0.5,
  temperature: 0.8,
};

/**
 * Reads voice settings from localStorage and returns a fully sanitized object.
 */
export function loadVoiceSettings() {
  let parsed = {};
  try {
    const raw = localStorage.getItem(VOICE_SETTINGS_KEY);
    if (raw) {
      const candidate = JSON.parse(raw);
      if (candidate !== null && typeof candidate === "object" && !Array.isArray(candidate)) {
        parsed = candidate;
      }
    }
  } catch {
    // Malformed JSON — fall back to defaults for all keys.
  }

  const result = {};
  for (const [key, defaultVal] of Object.entries(DEFAULT_VOICE_SETTINGS)) {
    if (typeof defaultVal === "number") {
      const coerced = parsed[key] == null ? NaN : Number(parsed[key]);
      if (Number.isNaN(coerced)) {
        result[key] = defaultVal;
      } else {
        const bounds = VOICE_SETTINGS_BOUNDS[key];
        if (bounds) {
          result[key] = Math.min(bounds.max, Math.max(bounds.min, coerced));
        } else {
          result[key] = coerced;
        }
      }
    } else if (typeof defaultVal === "boolean") {
      result[key] = typeof parsed[key] === "boolean" ? parsed[key] : defaultVal;
    } else {
      result[key] = typeof parsed[key] === typeof defaultVal ? parsed[key] : defaultVal;
    }
  }
  return result;
}

/**
 * Persists voice settings to localStorage.
 * Fails silently if storage is unavailable (private-browsing quota exceeded, etc.).
 */
export function persistVoiceSettings(settings) {
  try {
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable — continue without persisting.
  }
}
