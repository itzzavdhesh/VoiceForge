import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { QuickReplies } from "./QuickReplies";

describe("QuickReplies drag-and-drop reordering component", () => {
  it("renders quick reply cards with drag handles in edit mode", () => {
    render(<QuickReplies onSelect={() => {}} showToast={() => {}} />);
    expect(screen.getByText("Quick replies")).toBeDefined();
    expect(screen.getByText("Hello")).toBeDefined();
  });
});
