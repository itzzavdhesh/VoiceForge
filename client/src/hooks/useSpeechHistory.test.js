import { describe, it, expect } from "vitest";
import { pruneHistory } from "./useSpeechHistory.js";

describe("pruneHistory utility function", () => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const mockHistory = [
    { id: "1", text: "Fresh item", timestamp: now - 1 * oneDay },
    { id: "2", text: "8 days old", timestamp: now - 8 * oneDay },
    { id: "3", text: "35 days old", timestamp: now - 35 * oneDay },
    { id: "4", text: "Pinned but old", timestamp: now - 40 * oneDay }
  ];

  it("does not prune any items if policy is 'forever'", () => {
    const result = pruneHistory(mockHistory, [], "forever");
    expect(result).toHaveLength(4);
    expect(result).toEqual(mockHistory);
  });

  it("does not prune any items if policy is 'session'", () => {
    const result = pruneHistory(mockHistory, [], "session");
    expect(result).toHaveLength(4);
    expect(result).toEqual(mockHistory);
  });

  it("prunes items older than 7 days (policy: '7days')", () => {
    const result = pruneHistory(mockHistory, [], "7days");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("prunes items older than 30 days (policy: '30days')", () => {
    const result = pruneHistory(mockHistory, [], "30days");
    expect(result).toHaveLength(2);
    expect(result.map(item => item.id)).toEqual(["1", "2"]);
  });

  it("exempts pinned/favorite items from auto-pruning", () => {
    const favorites = ["4"]; // Pinned but old (40 days old)
    const result = pruneHistory(mockHistory, favorites, "7days");
    expect(result).toHaveLength(2);
    expect(result.map(item => item.id)).toEqual(["1", "4"]);
  });
});
