import { describe, it, expect } from "vitest";
import useVirtualCamera from "./useVirtualCamera";

describe("useVirtualCamera hook export module", () => {
  it("exports useVirtualCamera default hook function", () => {
    expect(typeof useVirtualCamera).toBe("function");
  });
});
