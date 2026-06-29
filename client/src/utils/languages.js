export const LANGUAGE_STORAGE_KEY = "voiceforge:language";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸", region: "Europe" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", region: "Europe" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", region: "Europe" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", region: "Europe" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹", region: "Europe" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", region: "Europe" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱", region: "Europe" },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱", region: "Europe" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", flag: "🇸🇪", region: "Europe" },
  { code: "da", name: "Danish", nativeName: "Dansk", flag: "🇩🇰", region: "Europe" },
  { code: "fi", name: "Finnish", nativeName: "Suomi", flag: "🇫🇮", region: "Europe" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", flag: "🇬🇷", region: "Europe" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺", region: "Europe" },
  { code: "no", name: "Norwegian", nativeName: "Norsk", flag: "🇳🇴", region: "Europe" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷", region: "Europe" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", region: "Asia & Pacific" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", region: "Asia & Pacific" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷", region: "Asia & Pacific" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳", region: "Asia & Pacific" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", flag: "🇲🇾", region: "Asia & Pacific" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", region: "Middle East" },
  { code: "he", name: "Hebrew", nativeName: "עברית", flag: "🇮🇱", region: "Middle East" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", flag: "🇰🇪", region: "Africa" },
];

const VALID_CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

export function isValidLanguageCode(code) { return code === "" || VALID_CODES.has(code); }

const BY_CODE = Object.fromEntries(SUPPORTED_LANGUAGES.map((l) => [l.code, l]));
export function getLanguageByCode(code) { return BY_CODE[code]; }

export function loadLanguage() {
  try {
    const legacyCompose = localStorage.getItem("voiceforge:compose-language");
    const current = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (current === null && legacyCompose) {
      const migrated = VALID_CODES.has(legacyCompose) ? legacyCompose : "en";
      localStorage.setItem(LANGUAGE_STORAGE_KEY, migrated);
      localStorage.removeItem("voiceforge:compose-language");
      return migrated;
    }
    return (current !== null && (current === "" || VALID_CODES.has(current))) ? current : "en";
  } catch { return "en"; }
}

export function persistLanguage(code) {
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY, code ?? ""); } catch {}
}

export function getRegions() {
  return [...new Set(SUPPORTED_LANGUAGES.map(l => l.region))];
}
