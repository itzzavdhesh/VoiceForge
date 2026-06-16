// Server-side language code validation for ElevenLabs eleven_multilingual_v2.
//
// Mirrors the client-side SUPPORTED_LANGUAGES list but only stores the code set
// since the server doesn't need display names, flags, or regions.

/**
 * All 29 language codes supported by ElevenLabs eleven_multilingual_v2.
 * @see https://elevenlabs.io/docs/capabilities/multilingual
 */
export const VALID_LANGUAGE_CODES = new Set([
  "ar",   // Arabic
  "bg",   // Bulgarian
  "zh",   // Chinese (Mandarin)
  "hr",   // Croatian
  "cs",   // Czech
  "da",   // Danish
  "nl",   // Dutch
  "en",   // English
  "fil",  // Filipino
  "fi",   // Finnish
  "fr",   // French
  "de",   // German
  "el",   // Greek
  "hi",   // Hindi
  "id",   // Indonesian
  "it",   // Italian
  "ja",   // Japanese
  "ko",   // Korean
  "ms",   // Malay
  "pl",   // Polish
  "pt",   // Portuguese
  "ro",   // Romanian
  "ru",   // Russian
  "sk",   // Slovak
  "es",   // Spanish
  "sv",   // Swedish
  "ta",   // Tamil
  "tr",   // Turkish
  "uk",   // Ukrainian
]);

/**
 * Returns true when `code` is either falsy (auto-detect mode, where
 * ElevenLabs infers the language from the input text) or a code
 * present in the supported set.
 *
 * @param {string|undefined|null} code
 * @returns {boolean}
 */
export function isValidLanguageCode(code) {
  return !code || VALID_LANGUAGE_CODES.has(code);
}
