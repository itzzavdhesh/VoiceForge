export const ACCESSIBILITY_SETTINGS_KEY = "voiceforge:accessibilitySettings";
export const ACCESSIBILITY_SETTINGS_CHANGED_EVENT = "voiceforge:accessibilitySettingsChanged";

export const DEFAULT_ACCESSIBILITY_SETTINGS = {
  webcamNavigationEnabled: false,
  dwellTime: 1500, // in milliseconds
};

export function loadAccessibilitySettings() {
  let parsed = {};
  try {
    const raw = localStorage.getItem(ACCESSIBILITY_SETTINGS_KEY);
    if (raw) {
      const candidate = JSON.parse(raw);
      if (candidate !== null && typeof candidate === "object" && !Array.isArray(candidate)) {
        parsed = candidate;
      }
    }
  } catch {
    // fall back
  }

  const result = {};
  for (const [key, defaultVal] of Object.entries(DEFAULT_ACCESSIBILITY_SETTINGS)) {
    if (typeof defaultVal === "boolean") {
      result[key] = typeof parsed[key] === "boolean" ? parsed[key] : defaultVal;
    } else if (typeof defaultVal === "number") {
      const coerced = parsed[key] == null ? NaN : Number(parsed[key]);
      if (Number.isNaN(coerced)) {
        result[key] = defaultVal;
      } else {
        if (key === "dwellTime") {
          result[key] = Math.min(3000, Math.max(500, coerced));
        } else {
          result[key] = coerced;
        }
      }
    }
  }
  return result;
}

export function persistAccessibilitySettings(settings) {
  try {
    localStorage.setItem(ACCESSIBILITY_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // fallback
  }
}
