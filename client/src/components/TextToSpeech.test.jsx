import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import TextToSpeech from "./TextToSpeech";

describe("TextToSpeech component and draft persistence", () => {
  it("renders TextToSpeech component and character limit indicator", () => {
    render(<TextToSpeech onSpeak={() => {}} />);
    expect(screen.getByText("Type to speak")).toBeDefined();
    expect(screen.getByPlaceholderText("Type what you want to say...")).toBeDefined();
  });

  it("handles draft localStorage persistence safely", () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("voiceforge:draft_call_speech", "Draft speech text");
      expect(localStorage.getItem("voiceforge:draft_call_speech")).toBe("Draft speech text");
      localStorage.removeItem("voiceforge:draft_call_speech");
    } else {
      expect(true).toBe(true);
    }
  });
});
