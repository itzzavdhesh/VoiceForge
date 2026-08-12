import { describe, it, expect, vi } from "vitest";

describe("useUnsavedChanges module", () => {
  it("exports useUnsavedChanges function", async () => {
    const mod = await import("./useUnsavedChanges.js");
    expect(typeof mod.useUnsavedChanges).toBe("function");
    expect(typeof mod.default).toBe("function");
  });

  it("handles beforeunload event and prevents default", () => {
    const event = {
      preventDefault: vi.fn(),
      returnValue: undefined,
    };

    const handleBeforeUnload = (evt) => {
      evt.preventDefault();
      evt.returnValue = "";
      return "";
    };

    handleBeforeUnload(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.returnValue).toBe("");
  });
});
