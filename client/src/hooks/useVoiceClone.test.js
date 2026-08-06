import { describe, it, expect, vi } from "vitest";
import useVoiceClone, { subscribeProfileChanges } from "./useVoiceClone";

describe("useVoiceClone hook and profile subscription module", () => {
  it("exports useVoiceClone default hook function", () => {
    expect(typeof useVoiceClone).toBe("function");
  });

  it("subscribes and cleans up profile change event listeners", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeProfileChanges(callback);

    expect(typeof unsubscribe).toBe("function");

    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("voiceforge:profileChanged"));
      expect(callback).toHaveBeenCalledTimes(1);
    }

    unsubscribe();
  });
});
