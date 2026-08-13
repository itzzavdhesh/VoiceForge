import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  exportSetupPayload,
  importSetupPayload,
  generateTransferUrl,
  EXPORT_STORAGE_KEYS,
} from "./profileExport.js";
import * as db from "./db.js";

vi.mock("./db.js", () => ({
  getAllProfiles: vi.fn(),
  saveProfile: vi.fn(),
}));

describe("profileExport utility", () => {
  let mockStore = {};
  const originalLocalStorage = globalThis.localStorage;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    mockStore = {};
    globalThis.localStorage = {
      getItem: vi.fn((key) => mockStore[key] ?? null),
      setItem: vi.fn((key, value) => {
        mockStore[key] = String(value);
      }),
      removeItem: vi.fn((key) => {
        delete mockStore[key];
      }),
      clear: vi.fn(() => {
        mockStore = {};
      }),
    };
    globalThis.window = {
      location: { origin: "https://voiceforge.app" },
      dispatchEvent: vi.fn(),
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalLocalStorage) {
      globalThis.localStorage = originalLocalStorage;
    } else {
      delete globalThis.localStorage;
    }
    if (originalWindow) {
      globalThis.window = originalWindow;
    } else {
      delete globalThis.window;
    }
  });

  it("exports, compresses, and generates a valid transfer URL", async () => {
    localStorage.setItem(
      EXPORT_STORAGE_KEYS.quick_replies,
      JSON.stringify(["Yes", "No"])
    );
    localStorage.setItem(EXPORT_STORAGE_KEYS.language, "es");

    db.getAllProfiles.mockResolvedValue([
      {
        voice_id: "voice_123",
        name: "Test Voice",
        colorTag: "emerald",
        avatarIcon: "user",
        createdAt: "2026-08-12T10:00:00.000Z",
      },
    ]);

    const payload = await exportSetupPayload();
    expect(typeof payload).toBe("string");
    expect(payload.length).toBeGreaterThan(0);

    const transferUrl = generateTransferUrl(
      payload,
      "https://app.voiceforge.io"
    );
    expect(transferUrl).toBe(
      `https://app.voiceforge.io/?import_payload=${payload}`
    );
  });

  it("decompresses and imports setup data into localStorage and IndexedDB", async () => {
    localStorage.setItem(
      EXPORT_STORAGE_KEYS.quick_replies,
      JSON.stringify(["Hello"])
    );
    localStorage.setItem(EXPORT_STORAGE_KEYS.language, "fr");

    db.getAllProfiles.mockResolvedValue([
      {
        voice_id: "voice_abc",
        name: "Clinician Voice",
        colorTag: "blue",
        avatarIcon: "sparkles",
        createdAt: "2026-08-12T10:00:00.000Z",
      },
    ]);

    const compressed = await exportSetupPayload();

    // Clear local state
    localStorage.clear();
    expect(localStorage.getItem(EXPORT_STORAGE_KEYS.language)).toBeNull();

    // Import compressed data
    const imported = await importSetupPayload(compressed);
    expect(imported.version).toBe(1);
    expect(localStorage.getItem(EXPORT_STORAGE_KEYS.language)).toBe("fr");
    expect(localStorage.getItem(EXPORT_STORAGE_KEYS.quick_replies)).toBe(
      JSON.stringify(["Hello"])
    );

    expect(db.saveProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        voice_id: "voice_abc",
        name: "Clinician Voice",
      })
    );
  });

  it("throws clear error on corrupted or invalid payloads", async () => {
    await expect(
      importSetupPayload("not-a-valid-lz-string-payload")
    ).rejects.toThrow();
    await expect(importSetupPayload("")).rejects.toThrow(
      "Invalid transfer payload."
    );
    await expect(importSetupPayload(null)).rejects.toThrow(
      "Invalid transfer payload."
    );
  });
});
