// Shared voice-settings helpers used by Onboarding, Settings, VoiceQuickSettings, and useTTS.
//
// Single source of truth for:
//   - the localStorage key
//   - the default/fallback values
//   - the sanitized loader (type-checks and clamps every field)
//   - the persister (safely stringifies to localStorage)

export const VOICE_SETTINGS_KEY = "voiceforge:voiceSettings";

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
 *
 * Sanitization rules (applied per key, driven by the type of the default):
 *   - number  : coerce with Number(); treat null/undefined/NaN as missing →
 *               use default. For defaults in [0, 1] clamp the result to [0, 1].
 *   - boolean : accept only actual booleans; anything else → use default.
 *   - other   : copy only when typeof matches; otherwise → use default.
 *
 * This guarantees callers (e.g. VoiceSlider) always receive the correct type
 * regardless of what was previously written to (or injected into) storage.
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
      // parsed[key] == null catches both null and undefined (Number(null) === 0,
      // which would be wrongly accepted as a valid value without this guard).
      const coerced = parsed[key] == null ? NaN : Number(parsed[key]);
      if (Number.isNaN(coerced)) {
        result[key] = defaultVal;
      } else if (defaultVal >= 0 && defaultVal <= 1) {
        // Slider range: clamp to [0, 1].
        result[key] = Math.min(1, Math.max(0, coerced));
      } else {
        // Non-slider numeric: accept coerced value as-is.
        result[key] = coerced;
      }
    } else if (typeof defaultVal === "boolean") {
      // Accept only actual booleans; anything else falls back to default.
      result[key] = typeof parsed[key] === "boolean" ? parsed[key] : defaultVal;
    } else {
      // For any future non-numeric, non-boolean key, copy only on type match.
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
