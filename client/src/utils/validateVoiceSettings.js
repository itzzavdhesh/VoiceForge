import { DEFAULT_VOICE_SETTINGS } from "./voiceSettings.js";

/**
 * Validates raw voice settings against numerical boundaries and type requirements.
 *
 * @param {object} settings Raw voice settings input.
 * @returns {object} Clean, clamped, type-safe settings object.
 */
export function validateVoiceSettings(settings = {}) {
  const input = typeof settings === "object" && settings !== null ? settings : {};
  
  const clamp = (val, min, max, fallback) => {
    const num = Number(val);
    return Number.isFinite(num) ? Math.min(max, Math.max(min, num)) : fallback;
  };

  return {
    stability: clamp(input.stability, 0, 1, DEFAULT_VOICE_SETTINGS.stability),
    similarity_boost: clamp(input.similarity_boost, 0, 1, DEFAULT_VOICE_SETTINGS.similarity_boost),
    style: clamp(input.style, 0, 1, DEFAULT_VOICE_SETTINGS.style),
    use_speaker_boost: typeof input.use_speaker_boost === "boolean" ? input.use_speaker_boost : DEFAULT_VOICE_SETTINGS.use_speaker_boost,
    speed: clamp(input.speed, 0.5, 2.0, DEFAULT_VOICE_SETTINGS.speed),
    pitch: clamp(input.pitch, 0.0, 1.0, DEFAULT_VOICE_SETTINGS.pitch),
  };
}

/**
 * Checks raw voice settings for out-of-bounds or invalid values.
 *
 * @param {object} settings Raw voice settings input.
 * @returns {string[]} List of validation error message strings.
 */
export function getValidationErrors(settings = {}) {
  const errors = [];
  if (typeof settings !== "object" || settings === null) {
    return ["Voice settings must be an object."];
  }

  if (settings.stability !== undefined && (typeof settings.stability !== "number" || settings.stability < 0 || settings.stability > 1)) {
    errors.push("Stability must be a number between 0.0 and 1.0.");
  }
  if (settings.similarity_boost !== undefined && (typeof settings.similarity_boost !== "number" || settings.similarity_boost < 0 || settings.similarity_boost > 1)) {
    errors.push("Similarity boost must be a number between 0.0 and 1.0.");
  }
  if (settings.style !== undefined && (typeof settings.style !== "number" || settings.style < 0 || settings.style > 1)) {
    errors.push("Style must be a number between 0.0 and 1.0.");
  }
  if (settings.speed !== undefined && (typeof settings.speed !== "number" || settings.speed < 0.5 || settings.speed > 2.0)) {
    errors.push("Speed must be a number between 0.5 and 2.0.");
  }
  if (settings.use_speaker_boost !== undefined && typeof settings.use_speaker_boost !== "boolean") {
    errors.push("Use speaker boost must be a boolean.");
  }

  return errors;
}
