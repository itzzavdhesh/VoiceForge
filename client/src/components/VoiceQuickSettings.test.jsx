import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { VoiceQuickSettings } from "./VoiceQuickSettings";

describe("VoiceQuickSettings component with Pitch Transposition and DSP Tone controls", () => {
  it("renders VoiceQuickSettings drawer button", () => {
    render(<VoiceQuickSettings defaultOpen={true} />);
    expect(screen.getByText("Voice Quick Settings")).toBeDefined();
    expect(screen.getByText("Pitch Transposition")).toBeDefined();
    expect(screen.getByText("DSP Tone Clarity")).toBeDefined();
  });
});
