import { describe, it, expect } from "vitest";
import { escapeCSVCell } from "../components/SpeechHistory";

describe("RFC 4180 CSV cell escaping utility", () => {
  it("escapes double quotes and wraps strings in quotes correctly", () => {
    expect(escapeCSVCell('Hello "World"')).toBe('"Hello ""World"""');
    expect(escapeCSVCell('Hello, World')).toBe('"Hello, World"');
    expect(escapeCSVCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
  });

  it("handles null and undefined safely", () => {
    expect(escapeCSVCell(null)).toBe('""');
    expect(escapeCSVCell(undefined)).toBe('""');
    expect(escapeCSVCell(123)).toBe('"123"');
  });
});
