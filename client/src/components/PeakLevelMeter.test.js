import { describe, it, expect } from "vitest";
import { PeakLevelMeter } from "./PeakLevelMeter";

describe("PeakLevelMeter component", () => {
  it("exports PeakLevelMeter function component", () => {
    expect(typeof PeakLevelMeter).toBe("function");
  });
});
