import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStoredValue, setStoredValue } from "./storage";

describe("storage helpers", () => {
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    globalThis.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
  });

  afterEach(() => {
    if (originalLocalStorage) {
      globalThis.localStorage = originalLocalStorage;
    } else {
      delete globalThis.localStorage;
    }
  });

  it("returns the fallback when localStorage reads throw", () => {
    globalThis.localStorage.getItem = vi.fn(() => {
      throw new DOMException("Access denied", "SecurityError");
    });

    expect(getStoredValue("voiceforge:test", "fallback")).toBe("fallback");
  });

  it("does not throw when localStorage writes fail", () => {
    globalThis.localStorage.setItem = vi.fn(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    expect(() => setStoredValue("voiceforge:test", "value")).not.toThrow();
  });
});
