import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import LiveTranscription from "./LiveTranscription";

// Mock matchMedia if needed by layout
window.matchMedia = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

describe("LiveTranscription component", () => {
  let mockRecognitionInstance;
  let OriginalSpeechRecognition;

  beforeEach(() => {
    OriginalSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    mockRecognitionInstance = {
      start: vi.fn(),
      stop: vi.fn(),
      continuous: false,
      interimResults: false,
      lang: "en-US",
      onresult: null,
      onerror: null,
      onend: null,
    };

    window.SpeechRecognition = function() { return mockRecognitionInstance; };
    window.webkitSpeechRecognition = window.SpeechRecognition;
  });

  afterEach(() => {
    window.SpeechRecognition = OriginalSpeechRecognition;
    window.webkitSpeechRecognition = OriginalSpeechRecognition;
    vi.clearAllMocks();
  });

  it("renders correctly and shows 'Listen' button initially", () => {
    render(<LiveTranscription />);
    expect(screen.getByText("Live Transcription")).toBeDefined();
    expect(screen.getByText("Listen")).toBeDefined();
  });

  it("starts listening when 'Listen' button is clicked", () => {
    render(<LiveTranscription />);
    const listenButton = screen.getByText("Listen");
    
    act(() => {
      fireEvent.click(listenButton);
    });

    expect(mockRecognitionInstance.start).toHaveBeenCalled();
    expect(screen.getByText("Stop")).toBeDefined();
  });

  it("stops listening when 'Stop' button is clicked", () => {
    render(<LiveTranscription />);
    const button = screen.getByText("Listen");
    
    act(() => {
      fireEvent.click(button); // Start
    });
    
    act(() => {
      fireEvent.click(screen.getByText("Stop")); // Stop
    });

    expect(mockRecognitionInstance.stop).toHaveBeenCalled();
    expect(screen.getByText("Listen")).toBeDefined();
  });

  it("displays transcript history on 'result' event", () => {
    render(<LiveTranscription />);
    
    act(() => {
      fireEvent.click(screen.getByText("Listen"));
    });

    // Simulate result event
    act(() => {
      if (mockRecognitionInstance.onresult) {
        mockRecognitionInstance.onresult({
          resultIndex: 0,
          results: [
            [{ transcript: "Hello world " }, { isFinal: true }] // Wait, the structure is results[i][0].transcript and results[i].isFinal
          ]
        });
      }
    });

    // Correcting mock event structure to match exactly what is expected:
    act(() => {
      if (mockRecognitionInstance.onresult) {
        mockRecognitionInstance.onresult({
          resultIndex: 0,
          results: [
            Object.assign([ { transcript: "Hello world" } ], { isFinal: true })
          ]
        });
      }
    });

    expect(screen.getByText("Hello world")).toBeDefined();
  });

  it("shows error when browser does not support SpeechRecognition", () => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;

    render(<LiveTranscription />);
    
    expect(screen.getByText(/Speech recognition is not supported/)).toBeDefined();
  });
});
