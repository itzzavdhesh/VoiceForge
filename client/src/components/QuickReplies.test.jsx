import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickReplies } from "./QuickReplies";

describe("QuickReplies component and hotkey shortcut triggers", () => {
  it("renders quick replies with hotkey badges", () => {
    render(<QuickReplies onSelect={() => {}} showToast={() => {}} />);
    expect(screen.getByText("Quick replies")).toBeDefined();
    expect(screen.getByText("Hello")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();
  });

  it("triggers onSelect when hotkey key is pressed", () => {
    const handleSelect = vi.fn();
    render(<QuickReplies onSelect={handleSelect} showToast={() => {}} />);

    fireEvent.keyDown(window, { key: "1" });
    expect(handleSelect).toHaveBeenCalledWith("Hello");
  });
});
