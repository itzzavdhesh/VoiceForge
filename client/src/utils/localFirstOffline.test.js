import { describe, it, expect } from "vitest";

describe("Local-First asset resolution and offline fallback helpers", () => {
  it("constructs local origin paths before falling back to external CDN URLs", () => {
    const origin = "http://localhost:5173";
    const file = "segmenter.wasm";

    const getLocateFile = (originUrl, fileName) => {
      if (originUrl) {
        return `${originUrl}/wasm/${fileName}`;
      }
      return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${fileName}`;
    };

    expect(getLocateFile(origin, file)).toBe("http://localhost:5173/wasm/segmenter.wasm");
    expect(getLocateFile(null, file)).toBe("https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/segmenter.wasm");
  });
});
