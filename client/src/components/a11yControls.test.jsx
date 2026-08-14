import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import TextToSpeech from "./TextToSpeech";
import { VoiceQuickSettings } from "./VoiceQuickSettings";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";

describe("Accessibility (a11y) attributes and status regions", () => {
  it("renders TextToSpeech textarea with aria-label and live status region", () => {
    render(<TextToSpeech status="speaking" />);
    const textarea = screen.getByRole("textbox", { name: "Text to synthesize" });
    expect(textarea).toBeDefined();
    expect(screen.getByText("Synthesizing and playing speech audio...")).toBeDefined();
  });

  it("renders VoiceQuickSettings sliders with ARIA value attributes", () => {
    render(<VoiceQuickSettings defaultOpen={true} />);
    const pitchSlider = screen.getByRole("slider", { name: "Pitch Transposition" });
    expect(pitchSlider.getAttribute("aria-valuemin")).toBe("-12");
    expect(pitchSlider.getAttribute("aria-valuemax")).toBe("12");
  });

  it("renders KeyboardShortcutsModal with dialog role and aria-describedby", () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-describedby")).toBe("keyboard-shortcuts-desc");
  });
});
