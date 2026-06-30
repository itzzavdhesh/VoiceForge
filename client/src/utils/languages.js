// Single source of truth for all Chatterbox Multilingual TTS supported languages.
//
// Every component that needs language data (LanguageSelector, Call, VoiceForge,
// Settings, useTTS) imports from here instead of hardcoding its own list.
//
// Storage: one unified localStorage key ("voiceforge:language") replaces the
// previously split "voiceforge:language" (Call) and "voiceforge:compose-language"
// (VoiceForge Compose) keys.

export const LANGUAGE_STORAGE_KEY = "voiceforge:language";

/**
 * All languages supported by the public Chatterbox Multilingual TTS Space,
 * grouped by region for the LanguageSelector UI.
 *
 * Each entry: { code, name, nativeName, flag, region }
 */
export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", flag: "EN", region: "Europe" },
  { code: "fr", name: "French", nativeName: "Francais", flag: "FR", region: "Europe" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "DE", region: "Europe" },
  { code: "es", name: "Spanish", nativeName: "Espanol", flag: "ES", region: "Europe" },
  { code: "pt", name: "Portuguese", nativeName: "Portugues", flag: "PT", region: "Europe" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "IT", region: "Europe" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "NL", region: "Europe" },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "PL", region: "Europe" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", flag: "SV", region: "Europe" },
  { code: "da", name: "Danish", nativeName: "Dansk", flag: "DA", region: "Europe" },
  { code: "fi", name: "Finnish", nativeName: "Suomi", flag: "FI", region: "Europe" },
  { code: "el", name: "Greek", nativeName: "Greek", flag: "EL", region: "Europe" },
  { code: "ru", name: "Russian", nativeName: "Russian", flag: "RU", region: "Europe" },
  { code: "no", name: "Norwegian", nativeName: "Norsk", flag: "NO", region: "Europe" },
  { code: "tr", name: "Turkish", nativeName: "Turkce", flag: "TR", region: "Europe" },

  { code: "hi", name: "Hindi", nativeName: "Hindi", flag: "HI", region: "Asia & Pacific" },
  { code: "ja", name: "Japanese", nativeName: "Japanese", flag: "JA", region: "Asia & Pacific" },
  { code: "ko", name: "Korean", nativeName: "Korean", flag: "KO", region: "Asia & Pacific" },
  { code: "zh", name: "Chinese", nativeName: "Chinese", flag: "ZH", region: "Asia & Pacific" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", flag: "MS", region: "Asia & Pacific" },

  { code: "ar", name: "Arabic", nativeName: "Arabic", flag: "AR", region: "Middle East" },
  { code: "he", name: "Hebrew", nativeName: "Hebrew", flag: "HE", region: "Middle East" },

  { code: "sw", name: "Swahili", nativeName: "Kiswahili", flag: "SW", region: "Africa" },
];

/** Set of all valid language codes for O(1) lookups. */
const VALID_CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

/**
 * Returns true when `code` is a supported Chatterbox language code,
 * or when it is falsy (meaning "auto-detect").
 */
export function isValidLanguageCode(code) {
  return !code || VALID_CODES.has(code);
}

const BY_CODE = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l])
);

/** Returns the language object for a given code, or undefined. */
export function getLanguageByCode(code) {
  return BY_CODE[code];
}

/**
 * Reads the saved language code from localStorage.
 * Falls back to "en" if the stored value is missing, empty, or invalid.
 *
 * Also performs a one-time migration from the legacy "voiceforge:compose-language"
 * key used by the Compose page.
 */
export function loadLanguage() {
  try {
    const legacyCompose = localStorage.getItem("voiceforge:compose-language");
    const current = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!current && legacyCompose) {
      const migrated = VALID_CODES.has(legacyCompose) ? legacyCompose : "en";
      localStorage.setItem(LANGUAGE_STORAGE_KEY, migrated);
      localStorage.removeItem("voiceforge:compose-language");
      return migrated;
    }

    const legacyNameToCode = Object.fromEntries(
      SUPPORTED_LANGUAGES.map(({ name, code }) => [name, code])
    );
    const normalized = legacyNameToCode[current] ?? current;

    return VALID_CODES.has(normalized) ? normalized : "en";
  } catch {
    return "en";
  }
}

/**
 * Persists the selected language code to localStorage.
 * Silently ignores storage errors (private browsing, quota, etc.).
 */
export function persistLanguage(code) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code || "en");
  } catch {
    // Storage unavailable - continue without persisting.
  }
}

/**
 * Returns the ordered list of unique region strings for grouping.
 */
export function getRegions() {
  const seen = new Set();
  const regions = [];
  for (const lang of SUPPORTED_LANGUAGES) {
    if (!seen.has(lang.region)) {
      seen.add(lang.region);
      regions.push(lang.region);
    }
  }
  return regions;
}
