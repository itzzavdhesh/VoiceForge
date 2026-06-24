import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatTime } from "../utils/formatTime.js";

describe("formatTime", () => {
  const FIXED_NOW = new Date("2024-01-15T12:00:00.000Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Just now' when timestamp is the current time", () => {
    expect(formatTime(FIXED_NOW)).toBe("Just now");
  });

  it("returns 'Just now' for timestamps less than 60 seconds ago", () => {
    expect(formatTime(FIXED_NOW - 30_000)).toBe("Just now");
    expect(formatTime(FIXED_NOW - 59_999)).toBe("Just now");
  });

  it("returns '1m ago' for a timestamp exactly 60 seconds ago", () => {
    expect(formatTime(FIXED_NOW - 60_000)).toBe("1m ago");
  });

  it("returns 'Nm ago' for timestamps between 1 and 59 minutes ago", () => {
    expect(formatTime(FIXED_NOW - 5 * 60_000)).toBe("5m ago");
    expect(formatTime(FIXED_NOW - 30 * 60_000)).toBe("30m ago");
    expect(formatTime(FIXED_NOW - 59 * 60_000)).toBe("59m ago");
  });

  it("returns a locale time string for timestamps between 1 and 24 hours ago", () => {
    const result = formatTime(FIXED_NOW - 2 * 3_600_000);
    expect(result).not.toMatch(/ago/);
    expect(result).not.toBe("Just now");
    expect(typeof result).toBe("string");
  });

  it("returns a locale date string for timestamps older than 24 hours", () => {
    const result = formatTime(FIXED_NOW - 25 * 3_600_000);
    expect(result).not.toMatch(/ago/);
    expect(result).not.toBe("Just now");
    expect(typeof result).toBe("string");
  });

  it("returns 'Just now' for invalid inputs like NaN, undefined, and null", () => {
    expect(formatTime(NaN)).toBe("Just now");
    expect(formatTime(undefined)).toBe("Just now");
    expect(formatTime(null)).toBe("Just now");
  });
});
