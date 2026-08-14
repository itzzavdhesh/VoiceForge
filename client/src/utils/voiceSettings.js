// Voice settings utilities for VoiceForge

export const DEFAULT_VOICE_SETTINGS = {
  stability: 0.45,
  similarity_boost: 0.8,
  style: 0.5,
  use_speaker_boost: true,
  speed: 1.0,
  pitch: 0.5,
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
    const saved = localStorage.getItem('voiceforge_voice_settings');
    if (saved) {
      parsed = JSON.parse(saved) || {};
    }
  } catch (error) {
    console.warn('Failed to load voice settings:', error);
  }

  const result = {};
  for (const [key, defaultVal] of Object.entries(DEFAULT_VOICE_SETTINGS)) {
    if (typeof defaultVal === "number") {
      // parsed[key] == null catches both null and undefined (Number(null) === 0,
      // which would be wrongly accepted as a valid value without this guard).
      const coerced = parsed[key] == null ? NaN : Number(parsed[key]);
      if (Number.isNaN(coerced)) {
        result[key] = defaultVal;
      } else if (key === "speed") {
        result[key] = Math.min(2.0, Math.max(0.5, coerced));
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
      result[key] =
        typeof parsed[key] === typeof defaultVal ? parsed[key] : defaultVal;
    }
  }
  return result;
}

export function persistVoiceSettings(settings) {
  try {
    localStorage.setItem('voiceforge_voice_settings', JSON.stringify(settings));
  } catch (error) {
    if (error?.name === "QuotaExceededError" || error?.code === 22) {
      console.warn("localStorage quota exceeded. Voice settings persisted for current session only.");
    } else {
      console.warn('Failed to save voice settings:', error);
    }
  }
}

export function resetVoiceSettings() {
  try {
    localStorage.removeItem('voiceforge_voice_settings');
  } catch (error) {
    console.warn('Failed to reset voice settings:', error);
  }
  return DEFAULT_VOICE_SETTINGS;
}
