import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import VideoPreview from "./VideoPreview";

// Mock the ThemeContext
vi.mock("./ThemeContext", () => {
  return {
    useTheme: () => ({ theme: "light", setTheme: vi.fn() })
  };
});

// Mock the complex processors
vi.mock("../utils/audioProcessor", () => {
  return {
    AudioProcessor: vi.fn().mockImplementation(function() {
      return {
        initialize: vi.fn(),
        dispose: vi.fn(),
        getLatestFeatures: vi.fn(),
        getAudioTime: vi.fn(),
        getVolume: vi.fn(() => 0),
        getFrequencyData: vi.fn(() => new Uint8Array(5))
      };
    })
  };
});

vi.mock("../utils/faceProcessor", () => {
  return {
    FaceProcessor: vi.fn().mockImplementation(function() {
      return {
        initialize: vi.fn(),
        dispose: vi.fn(),
        detectFace: vi.fn(),
        cropMouthRegion: vi.fn()
      };
    })
  };
});

// Mock the audioOutput utility
vi.mock("../utils/audioOutput", () => {
  return {
    applyAudioOutput: vi.fn()
  };
});

// Mock canvas API
HTMLCanvasElement.prototype.getContext = () => {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    ellipse: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 10 })),
  };
};

describe("VideoPreview component", () => {
  it("renders correctly with initial state", () => {
    // We need to create a dummy ref
    const ref = React.createRef();
    
    render(
      <VideoPreview 
        ref={ref}
        webcamStream={null} 
        audioUrl={null} 
        isSpeaking={false} 
        onSpeakingChange={() => {}}
      />
    );
    expect(screen.getByText("Lip-synced output")).toBeDefined();
    expect(screen.getByRole("img", { name: "Lip-synced video output preview" })).toBeDefined();
  });
});
