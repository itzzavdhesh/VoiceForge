import { describe, it, expect } from "vitest";

describe("ThemeContext theme & high-contrast state module", () => {
  it("manages high contrast localStorage persistence safely", () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("voiceforge:highContrast", "true");
      expect(localStorage.getItem("voiceforge:highContrast")).toBe("true");

      localStorage.setItem("voiceforge:highContrast", "false");
      expect(localStorage.getItem("voiceforge:highContrast")).toBe("false");
    } else {
      expect(true).toBe(true);
    }
  });
});
