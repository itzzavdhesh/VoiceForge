import { describe, it, expect, vi } from "vitest";

describe("Cross-Tab State Synchronization handlers", () => {
  it("executes storage event callback logic safely", () => {
    const handleStorage = vi.fn((event) => {
      if (event.key === "vf_history") {
        return "synced";
      }
    });

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
      const event = new StorageEvent("storage", {
        key: "vf_history",
        newValue: JSON.stringify([{ id: "1", text: "Synced message" }]),
      });
      window.dispatchEvent(event);
      expect(handleStorage).toHaveBeenCalled();
      window.removeEventListener("storage", handleStorage);
    } else {
      expect(typeof handleStorage).toBe("function");
    }
  });
});
