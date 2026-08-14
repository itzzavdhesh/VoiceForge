export const LANGUAGE_STORAGE_KEY = "voiceforge:language";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸", region: "Europe" },
  { code: "fr", name: "French", nativeName: "Francais", flag: "🇫🇷", region: "Europe" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", region: "Europe" },
  { code: "es", name: "Spanish", nativeName: "Espanol", flag: "🇪🇸", region: "Europe" },
  { code: "pt", name: "Portuguese", nativeName: "Portugues", flag: "🇵🇹", region: "Europe" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", region: "Europe" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱", region: "Europe" },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱", region: "Europe" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", flag: "🇸🇪", region: "Europe" },
  { code: "da", name: "Danish", nativeName: "Dansk", flag: "🇩🇰", region: "Europe" },
  { code: "fi", name: "Finnish", nativeName: "Suomi", flag: "🇫🇮", region: "Europe" },
  { code: "el", name: "Greek", nativeName: "Greek", flag: "🇬🇷", region: "Europe" },
  { code: "ru", name: "Russian", nativeName: "Russian", flag: "🇷🇺", region: "Europe" },
  { code: "no", name: "Norwegian", nativeName: "Norsk", flag: "🇳🇴", region: "Europe" },
  { code: "tr", name: "Turkish", nativeName: "Turkce", flag: "🇹🇷", region: "Europe" },

  { code: "hi", name: "Hindi", nativeName: "Hindi", flag: "🇮🇳", region: "Asia & Pacific" },
  { code: "ja", name: "Japanese", nativeName: "Japanese", flag: "🇯🇵", region: "Asia & Pacific" },
  { code: "ko", name: "Korean", nativeName: "Korean", flag: "🇰🇷", region: "Asia & Pacific" },
  { code: "zh", name: "Chinese", nativeName: "Chinese", flag: "🇨🇳", region: "Asia & Pacific" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", flag: "🇲🇾", region: "Asia & Pacific" },

  { code: "ar", name: "Arabic", nativeName: "Arabic", flag: "🇸🇦", region: "Middle East" },
  { code: "he", name: "Hebrew", nativeName: "Hebrew", flag: "🇮🇱", region: "Middle East" },

  { code: "sw", name: "Swahili", nativeName: "Kiswahili", flag: "🇰🇪", region: "Africa" },
];

const VALID_CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

export function isValidLanguageCode(code) { return code === "" || VALID_CODES.has(code); }

const BY_CODE = Object.fromEntries(SUPPORTED_LANGUAGES.map((l) => [l.code, l]));
export function getLanguageByCode(code) { return BY_CODE[code]; }

/** Returns the language object for a given code, or undefined. */
export function getLanguageByCode(code) {
  return BY_CODE[code];
}

/**
 * Reads the saved language code from localStorage.
 * Returns "" (auto-detect) if the stored value is missing or invalid.
 */
export function loadLanguage() {
  try {
    const current = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    // If it's valid, return it; otherwise return empty string for auto-detect
    return isValidLanguageCode(current) ? (current || "") : "";
  } catch {
    return "";
  }
}

export function persistLanguage(code) {
  try {
    // Save the raw code (allowing "" for Auto-detect)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code ?? "");
  } catch {
    // Storage unavailable - continue without persisting.
  }
}

export function getRegions() {
  return [...new Set(SUPPORTED_LANGUAGES.map(l => l.region))];
}
