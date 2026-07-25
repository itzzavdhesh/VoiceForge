import { describe, it, expect } from "vitest";
import { saveProfile, deleteProfile, clearStorage } from "./db";

describe("db.js write queue utility functions", () => {
  it("exports saveProfile, deleteProfile, and clearStorage functions", () => {
    expect(typeof saveProfile).toBe("function");
    expect(typeof deleteProfile).toBe("function");
    expect(typeof clearStorage).toBe("function");
  });
});
