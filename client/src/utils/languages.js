// Single source of truth for all ElevenLabs eleven_multilingual_v2 supported languages.
//
// Every component that needs language data (LanguageSelector, Call, VoiceForge,
// Settings, useTTS) imports from here instead of hardcoding its own list.
//
// Storage: one unified localStorage key ("voiceforge:language") replaces the
// previously split "voiceforge:language" (Call) and "voiceforge:compose-language"
// (VoiceForge Compose) keys.

export const LANGUAGE_STORAGE_KEY = "voiceforge:language";

/**
 * All 29 languages supported by ElevenLabs eleven_multilingual_v2,
 * grouped by region for the LanguageSelector UI.
 *
 * Each entry: { code, name, nativeName, flag, region }
 *   - code:       BCP-47 / ISO 639 language code sent to the API
 *   - name:       English display name
 *   - nativeName: name in the language itself (aids non-English speakers)
 *   - flag:       emoji flag for visual identification
 *   - region:     grouping label used by LanguageSelector
 */
export const SUPPORTED_LANGUAGES = [
  // ── Europe ──────────────────────────────────────────────────────────────
  { code: "en",  name: "English",    nativeName: "English",    flag: "🇬🇧", region: "Europe" },
  { code: "fr",  name: "French",     nativeName: "Français",   flag: "🇫🇷", region: "Europe" },
  { code: "de",  name: "German",     nativeName: "Deutsch",    flag: "🇩🇪", region: "Europe" },
  { code: "es",  name: "Spanish",    nativeName: "Español",    flag: "🇪🇸", region: "Europe" },
  { code: "pt",  name: "Portuguese", nativeName: "Português",  flag: "🇵🇹", region: "Europe" },
  { code: "it",  name: "Italian",    nativeName: "Italiano",   flag: "🇮🇹", region: "Europe" },
  { code: "nl",  name: "Dutch",      nativeName: "Nederlands", flag: "🇳🇱", region: "Europe" },
  { code: "pl",  name: "Polish",     nativeName: "Polski",     flag: "🇵🇱", region: "Europe" },
  { code: "sv",  name: "Swedish",    nativeName: "Svenska",    flag: "🇸🇪", region: "Europe" },
  { code: "da",  name: "Danish",     nativeName: "Dansk",      flag: "🇩🇰", region: "Europe" },
  { code: "fi",  name: "Finnish",    nativeName: "Suomi",      flag: "🇫🇮", region: "Europe" },
  { code: "el",  name: "Greek",      nativeName: "Ελληνικά",   flag: "🇬🇷", region: "Europe" },
  { code: "cs",  name: "Czech",      nativeName: "Čeština",    flag: "🇨🇿", region: "Europe" },
  { code: "sk",  name: "Slovak",     nativeName: "Slovenčina",  flag: "🇸🇰", region: "Europe" },
  { code: "ro",  name: "Romanian",   nativeName: "Română",     flag: "🇷🇴", region: "Europe" },
  { code: "bg",  name: "Bulgarian",  nativeName: "Български",  flag: "🇧🇬", region: "Europe" },
  { code: "hr",  name: "Croatian",   nativeName: "Hrvatski",   flag: "🇭🇷", region: "Europe" },
  { code: "uk",  name: "Ukrainian",  nativeName: "Українська", flag: "🇺🇦", region: "Europe" },
  { code: "ru",  name: "Russian",    nativeName: "Русский",    flag: "🇷🇺", region: "Europe" },
  { code: "tr",  name: "Turkish",    nativeName: "Türkçe",     flag: "🇹🇷", region: "Europe" },

  // ── Asia & Pacific ──────────────────────────────────────────────────────
  { code: "hi",  name: "Hindi",      nativeName: "हिन्दी",       flag: "🇮🇳", region: "Asia & Pacific" },
  { code: "ta",  name: "Tamil",      nativeName: "தமிழ்",       flag: "🇮🇳", region: "Asia & Pacific" },
  { code: "ja",  name: "Japanese",   nativeName: "日本語",       flag: "🇯🇵", region: "Asia & Pacific" },
  { code: "ko",  name: "Korean",     nativeName: "한국어",       flag: "🇰🇷", region: "Asia & Pacific" },
  { code: "zh",  name: "Chinese",    nativeName: "中文",         flag: "🇨🇳", region: "Asia & Pacific" },
  { code: "id",  name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩", region: "Asia & Pacific" },
  { code: "ms",  name: "Malay",      nativeName: "Bahasa Melayu",   flag: "🇲🇾", region: "Asia & Pacific" },
  { code: "fil", name: "Filipino",   nativeName: "Filipino",   flag: "🇵🇭", region: "Asia & Pacific" },

  // ── Middle East ─────────────────────────────────────────────────────────
  { code: "ar",  name: "Arabic",     nativeName: "العربية",     flag: "🇸🇦", region: "Middle East" },
];

/** Set of all valid language codes for O(1) lookups. */
const VALID_CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

/**
 * Returns true when `code` is a supported ElevenLabs language code,
 * or when it is falsy (meaning "auto-detect").
 */
export function isValidLanguageCode(code) {
  return !code || VALID_CODES.has(code);
}

/**
 * Map from code → language object for quick lookups.
 */
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
    // Migrate legacy compose key if it exists and the unified key is absent.
    const legacyCompose = localStorage.getItem("voiceforge:compose-language");
    const current = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!current && legacyCompose) {
      const migrated = VALID_CODES.has(legacyCompose) ? legacyCompose : "en";
      localStorage.setItem(LANGUAGE_STORAGE_KEY, migrated);
      localStorage.removeItem("voiceforge:compose-language");
      return migrated;
    }

    // Handle legacy full-name values ("English", "Hindi", etc.)
    const LEGACY_NAME_TO_CODE = {
      English: "en", Hindi: "hi", Spanish: "es", French: "fr",
      German: "de", Portuguese: "pt", Japanese: "ja",
    };
    const normalized = LEGACY_NAME_TO_CODE[current] || current;

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
    // Storage unavailable — continue without persisting.
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
