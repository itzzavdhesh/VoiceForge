import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AACSymbolBoard, AAC_SYMBOL_CATEGORIES } from "./AACSymbolBoard";

describe("AACSymbolBoard component", () => {
  it("renders categories and symbols correctly", () => {
    render(<AACSymbolBoard onSelectSymbol={() => {}} />);
    expect(screen.getByText("AAC Picture-Symbol Board")).toBeDefined();
    expect(screen.getByText("Needs")).toBeDefined();
    expect(screen.getByText("Water")).toBeDefined();
  });

  it("handles symbol selection when clicked", () => {
    const handleSelect = vi.fn();
    render(<AACSymbolBoard onSelectSymbol={handleSelect} />);

    const waterButton = screen.getByText("Water").closest("button");
    fireEvent.click(waterButton);

    expect(handleSelect).toHaveBeenCalledWith("I need water, please.");
  });

  it("exports valid categories and symbols data", () => {
    expect(Array.isArray(AAC_SYMBOL_CATEGORIES)).toBe(true);
    expect(AAC_SYMBOL_CATEGORIES.length).toBeGreaterThan(0);
  });
});
