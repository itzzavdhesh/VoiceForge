// Voice settings utilities for VoiceForge

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
  dspPitch: 1.0,
  dspSpeed: 1.0,
  dspBass: 0.0,
  dspMid: 0.0,
  dspTreble: 0.0,
};

/**
 * Predefined presets for Voice Synthesis Settings.
 * Each preset defines stability, temperature, and style.
 */
export const VOICE_PRESETS = {
  neutral: {
    name: "Narrator / Neutral",
    stability: 0.70,
    temperature: 0.60,
    style: 0.30,
    dspPitch: 1.0,
    dspSpeed: 1.0,
    dspBass: 0.0,
    dspMid: 0.0,
    dspTreble: 0.0,
  },
  excited: {
    name: "Excited / Energetic",
    stability: 0.40,
    temperature: 0.95,
    style: 0.75,
    dspPitch: 1.10,
    dspSpeed: 1.15,
    dspBass: -2.0,
    dspMid: 1.0,
    dspTreble: 4.0,
  },
  robotic: {
    name: "Robotic / Flat",
    stability: 0.95,
    temperature: 0.10,
    style: 0.05,
    dspPitch: 0.90,
    dspSpeed: 0.95,
    dspBass: 2.0,
    dspMid: -3.0,
    dspTreble: -2.0,
  },
  soft: {
    name: "Soft / Whispering",
    stability: 0.55,
    temperature: 0.50,
    style: 0.20,
    dspPitch: 1.05,
    dspSpeed: 0.85,
    dspBass: -4.0,
    dspMid: 2.0,
    dspTreble: 2.0,
  },
};



/**
 * Reads voice settings from localStorage and returns a fully sanitized object.
 */
export function loadVoiceSettings() {
  try {
    const raw = localStorage.getItem(VOICE_SETTINGS_KEY);
    if (raw) {
      const candidate = JSON.parse(raw);
      if (candidate !== null && typeof candidate === "object" && !Array.isArray(candidate)) {
        parsed = candidate;
      }
    }
  } catch (error) {
    console.warn('Failed to load voice settings:', error);
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

export function persistVoiceSettings(settings) {
  try {
    localStorage.setItem('voiceforge_voice_settings', JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save voice settings:', error);
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
