import { describe, it, expect, vi } from "vitest";
import { AudioProcessor } from "./audioProcessor";

describe("Stream and audio graph node cleanup", () => {
  it("disconnects source nodes and closes audio context on dispose", () => {
    const processor = new AudioProcessor();
    const mockDisconnect = vi.fn();
    const mockClose = vi.fn();

    processor.source = { disconnect: mockDisconnect };
    processor.audioContext = { state: "running", close: mockClose };
    processor.analyzer = { stop: vi.fn() };

    processor.dispose();

    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
    expect(processor.source).toBeNull();
    expect(processor.audioContext).toBeNull();
  });
});
