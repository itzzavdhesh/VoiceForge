// Server-side language validation for Chatterbox Multilingual TTS.

/**
 * All language codes supported by the public Chatterbox Multilingual TTS Space.
 */
export const VALID_LANGUAGE_CODES = new Set([
  "ar",
  "da",
  "de",
  "el",
  "en",
  "es",
  "fi",
  "fr",
  "he",
  "hi",
  "it",
  "ja",
  "ko",
  "ms",
  "nl",
  "no",
  "pl",
  "pt",
  "ru",
  "sv",
  "sw",
  "tr",
  "zh",
]);

/**
 * Returns true when `code` is either falsy (auto-detect fallback) or a
 * code present in the Chatterbox supported set.
 *
 * @param {string|undefined|null} code
 * @returns {boolean}
 */
export function isValidLanguageCode(code) {
  if (code === undefined || code === null || code === "") return true;
  return typeof code === "string" && VALID_LANGUAGE_CODES.has(code);
}

/**
 * Returns the language code expected by the Chatterbox /predict endpoint.
 * Falls back to English when the client omits a language.
 *
 * @param {string|undefined|null} code
 * @returns {string}
 */
export function toChatterboxLanguageCode(code) {
  return VALID_LANGUAGE_CODES.has(code) ? code : "en";
}
