import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadLanguage,
  persistLanguage,
  subscribeLanguageChange,
  LANGUAGE_STORAGE_KEY,
  isValidLanguageCode,
  getLanguageByCode,
} from "./languages";

describe("languages.js utility and multi-tab synchronization", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("validates language codes correctly", () => {
    expect(isValidLanguageCode("en")).toBe(true);
    expect(isValidLanguageCode("fr")).toBe(true);
    expect(isValidLanguageCode("hi")).toBe(true);
    expect(isValidLanguageCode("invalid_code")).toBe(false);
  });

  it("retrieves language objects by code", () => {
    const lang = getLanguageByCode("fr");
    expect(lang).toBeDefined();
    expect(lang.name).toBe("French");
  });

  it("migrates legacy compose language storage key", () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("voiceforge:compose-language", "de");
      const loaded = loadLanguage();
      expect(loaded).toBe("de");
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("de");
      expect(localStorage.getItem("voiceforge:compose-language")).toBeNull();
    }
  });

  it("persists language and dispatches custom change event", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeLanguageChange(callback);

    persistLanguage("es");
    if (typeof localStorage !== "undefined") {
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("es");
    }

    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      expect(callback).toHaveBeenCalledWith("es");
    }

    unsubscribe();
  });
});
