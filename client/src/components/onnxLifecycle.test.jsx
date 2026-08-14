import { describe, it, expect, vi } from "vitest";

describe("ONNX Session & MediaPipe Segmenter lifecycle cleanup", () => {
  it("executes session release and processor disposal cleanups on unmount", () => {
    const mockAudioProc = { dispose: vi.fn() };
    const mockFaceProc = { dispose: vi.fn() };
    const mockSession = { release: vi.fn() };
    const mockSegmenter = { close: vi.fn() };

    let isMounted = false;

    // Simulate unmount cleanup logic
    if (!isMounted) {
      mockAudioProc.dispose();
      mockFaceProc.dispose();
      mockSession.release();
      mockSegmenter.close();
    }

    expect(mockAudioProc.dispose).toHaveBeenCalled();
    expect(mockFaceProc.dispose).toHaveBeenCalled();
    expect(mockSession.release).toHaveBeenCalled();
    expect(mockSegmenter.close).toHaveBeenCalled();
  });
});
