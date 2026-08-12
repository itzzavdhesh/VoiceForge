import { describe, it, expect } from "vitest";
import { AudioProcessor, getSharedAudioContext } from "./audioProcessor";

describe("audioProcessor utility and singleton AudioContext module", () => {
  it("instantiates AudioProcessor class cleanly", () => {
    const processor = new AudioProcessor();
    expect(processor).toBeDefined();
    expect(typeof processor.initialize).toBe("function");
    expect(typeof processor.dispose).toBe("function");
  });

  it("handles getSharedAudioContext in test environment safely", () => {
    const ctx = getSharedAudioContext();
    if (typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext)) {
      expect(ctx).toBeDefined();
    } else {
      expect(ctx).toBeNull();
    }
  });

  it("handles non-destructive dispose without throwing exceptions", () => {
    const processor = new AudioProcessor();
    expect(() => processor.dispose()).not.toThrow();
  });
});
