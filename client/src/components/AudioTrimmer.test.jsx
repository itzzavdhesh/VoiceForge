import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { AudioTrimmer } from "./AudioTrimmer";

// Mock the canvas API and audio context which aren't fully supported in JSDOM
HTMLCanvasElement.prototype.getContext = () => {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    roundRect: vi.fn(),
    rect: vi.fn(),
  };
};

window.AudioContext = vi.fn().mockImplementation(function() {
  return {
    decodeAudioData: vi.fn().mockResolvedValue({
      duration: 10,
      getChannelData: () => new Float32Array(100),
    }),
    close: vi.fn(),
    createBufferSource: vi.fn().mockReturnValue({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }),
    destination: {},
  };
});

describe("AudioTrimmer component", () => {
  it("renders correctly with no audioBlob", () => {
    render(<AudioTrimmer audioBlob={null} onTrimComplete={() => {}} />);
    expect(screen.getByText("✂️ Reference Audio Trimmer")).toBeDefined();
    expect(screen.getByText("Play Selection")).toBeDefined();
    expect(screen.getByText("Apply Selection")).toBeDefined();
  });

  it("renders correctly with a mock audioBlob", async () => {
    const blob = new Blob(["fake audio data"], { type: "audio/webm" });
    blob.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
    
    render(<AudioTrimmer audioBlob={blob} onTrimComplete={() => {}} />);
    
    expect(screen.getByText("✂️ Reference Audio Trimmer")).toBeDefined();
    expect(screen.getByText("Play Selection")).toBeDefined();
    expect(screen.getByText("Apply Selection")).toBeDefined();
  });
});
