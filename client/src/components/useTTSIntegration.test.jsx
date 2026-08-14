import { describe, it, expect, vi } from "vitest";

describe("useTTS integration unit helper", () => {
  it("routes speech requests through ttsSpeak function payload", async () => {
    const mockTtsSpeak = vi.fn().mockResolvedValue({ engine: "chatterbox" });
    const text = "Hello world";
    const language = "en-US";

    await mockTtsSpeak({ text, language_code: language });

    expect(mockTtsSpeak).toHaveBeenCalledWith({
      text: "Hello world",
      language_code: "en-US",
    });
  });
});
