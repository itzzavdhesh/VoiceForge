import { describe, it, expect } from "vitest";
import useTTS from "./useTTS";

describe("useTTS hook export module", () => {
  it("exports useTTS default hook function", () => {
    expect(typeof useTTS).toBe("function");
  });
});
