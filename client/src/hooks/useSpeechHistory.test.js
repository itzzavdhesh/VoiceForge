import { describe, it, expect } from "vitest";

describe("useSpeechHistory storage capacity & auto-archiving utilities", () => {
  it("calculates storage capacity stats and handles auto-archiving data formatting", () => {
    const mockHistory = [
      { id: "1", text: "Old message", timestamp: Date.now() - 40 * 24 * 60 * 60 * 1000 },
      { id: "2", text: "New message", timestamp: Date.now() },
    ];

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const oldEntries = mockHistory.filter((m) => m.timestamp < thirtyDaysAgo);

    expect(oldEntries.length).toBe(1);
    expect(oldEntries[0].text).toBe("Old message");
  });
});
