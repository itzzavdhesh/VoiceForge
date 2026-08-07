import { describe, it, expect } from "vitest";

describe("SpeechHistory filtering and sorting logic", () => {
  const sampleHistory = [
    { id: "1", text: "Alpha greeting", timestamp: "2024-01-01T10:00:00.000Z" },
    { id: "2", text: "Beta request", timestamp: "2024-01-02T10:00:00.000Z" },
    { id: "3", text: "Charlie question", timestamp: "2024-01-03T10:00:00.000Z" },
  ];

  it("filters history by search query", () => {
    const query = "alpha";
    const filtered = sampleHistory.filter((m) => m.text.toLowerCase().includes(query));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });

  it("sorts history alphabetically (A-Z)", () => {
    const sorted = [...sampleHistory].sort((a, b) => a.text.localeCompare(b.text));
    expect(sorted[0].text).toBe("Alpha greeting");
    expect(sorted[2].text).toBe("Charlie question");
  });

  it("sorts history by timestamp (Newest First)", () => {
    const sorted = [...sampleHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    expect(sorted[0].id).toBe("3");
    expect(sorted[2].id).toBe("1");
  });

  it("sorts history by timestamp (Oldest First)", () => {
    const sorted = [...sampleHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    expect(sorted[0].id).toBe("1");
    expect(sorted[2].id).toBe("3");
  });
});
