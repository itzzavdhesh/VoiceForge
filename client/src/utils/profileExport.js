import LZString from "lz-string";
import { getAllProfiles, saveProfile } from "./db.js";
import { ACCESSIBILITY_SETTINGS_KEY } from "./accessibilitySettings.js";
import { LANGUAGE_STORAGE_KEY } from "./languages.js";
import { VOICE_SETTINGS_KEY } from "./voiceSettings.js";

export const EXPORT_STORAGE_KEYS = {
  history: "vf_history",
  favorites: "vf_favorites",
  quick_replies: "vf_quick_replies",
  voiceSettings: VOICE_SETTINGS_KEY,
  accessibilitySettings: ACCESSIBILITY_SETTINGS_KEY,
  language: LANGUAGE_STORAGE_KEY,
  calibrationXOffset: "voiceforge:calibrationXOffset",
  calibrationYOffset: "voiceforge:calibrationYOffset",
  calibrationScale: "voiceforge:calibrationScale",
  subtitlesEnabled: "voiceforge:subtitlesEnabled",
  subtitleFontSize: "voiceforge:subtitleFontSize",
  subtitleBgOpacity: "voiceforge:subtitleBgOpacity",
  activeVoiceId: "voiceforge:activeVoiceId",
};

/**
 * Gathers user setup data, serializes to JSON, and compresses to a URL-safe string.
 *
 * @returns {Promise<string>} The compressed URI-encoded payload string.
 */
export async function exportSetupPayload() {
  const storage = {};
  for (const [prop, key] of Object.entries(EXPORT_STORAGE_KEYS)) {
    try {
      const val = localStorage.getItem(key);
      if (val !== null) {
        storage[prop] = val;
      }
    } catch {}
  }

  let profiles = [];
  try {
    const loaded = await getAllProfiles();
    profiles = (loaded || []).map((p) => ({
      voice_id: p.voice_id,
      name: p.name,
      colorTag: p.colorTag,
      avatarIcon: p.avatarIcon,
      createdAt: p.createdAt,
    }));
  } catch (err) {
    console.warn("Failed to load IndexedDB profiles during setup export:", err);
  }

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    storage,
    profiles,
  };

  const jsonString = JSON.stringify(payload);
  return LZString.compressToEncodedURIComponent(jsonString);
}

/**
 * Decompresses, validates schema, and imports setup data into localStorage & IndexedDB.
 *
 * @param {string} compressedString Compressed URI component payload string.
 * @returns {Promise<object>} The parsed imported data object.
 */
export async function importSetupPayload(compressedString) {
  if (!compressedString || typeof compressedString !== "string") {
    throw new Error("Invalid transfer payload.");
  }

  const decompressed =
    LZString.decompressFromEncodedURIComponent(compressedString);
  if (!decompressed) {
    throw new Error(
      "Failed to decompress setup data. The link or QR code may be corrupt or truncated."
    );
  }

  let data;
  try {
    data = JSON.parse(decompressed);
  } catch (err) {
    throw new Error("Malformed JSON payload: " + (err.message || String(err)));
  }

  if (!data || typeof data !== "object" || !data.storage) {
    throw new Error("Invalid setup payload schema.");
  }

  // Restore localStorage items
  for (const [prop, key] of Object.entries(EXPORT_STORAGE_KEYS)) {
    if (prop in data.storage) {
      const val = data.storage[prop];
      if (typeof val === "string") {
        localStorage.setItem(key, val);
      }
    }
  }

  // Restore voice profiles to IndexedDB
  if (Array.isArray(data.profiles)) {
    for (const p of data.profiles) {
      if (p && typeof p === "object" && typeof p.voice_id === "string" && p.voice_id.trim()) {
        const safeVoiceId = p.voice_id.trim();
        const safeName = typeof p.name === "string" && p.name.trim() ? p.name.trim() : "Imported Voice";
        try {
          await saveProfile({
            id: safeVoiceId,
            voice_id: safeVoiceId,
            name: safeName,
            colorTag: typeof p.colorTag === "string" ? p.colorTag : "emerald",
            avatarIcon: typeof p.avatarIcon === "string" ? p.avatarIcon : "user",
            ownerToken: typeof p.ownerToken === "string" ? p.ownerToken : null,
            createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date().toISOString(),
            audioBlob: null,
          });
        } catch (err) {
          console.warn("Failed to restore profile:", p.voice_id, err);
        }
      }
    }
  }

  // Dispatch change events so active views refresh immediately
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("voiceforge:profileChanged"));
    window.dispatchEvent(new CustomEvent("voiceforge:settingsChanged"));
    window.dispatchEvent(new Event("storage"));
  }

  return data;
}

/**
 * Generates a full transfer URL containing the compressed payload.
 *
 * @param {string} compressedPayload The compressed setup payload.
 * @param {string} [origin] The origin URL (defaults to window.location.origin).
 * @returns {string} The complete transfer URL.
 */
export function generateTransferUrl(
  compressedPayload,
  origin = typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:5173"
) {
  return `${origin}/?import_payload=${compressedPayload}`;
}
