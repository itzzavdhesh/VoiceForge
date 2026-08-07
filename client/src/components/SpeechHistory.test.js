import { describe, it, expect } from "vitest";
import { escapeRegExp } from "./SpeechHistory";

describe("SpeechHistory escapeRegExp search query sanitizer", () => {
  it("escapes regex special characters safely", () => {
    expect(escapeRegExp("(hello)")).toBe("\\(hello\\)");
    expect(escapeRegExp("[urgent]")).toBe("\\[urgent\\]");
    expect(escapeRegExp("what?")).toBe("what\\?");
    expect(escapeRegExp("1+1*2")).toBe("1\\+1\\*2");
  });

  it("handles empty or normal strings without altering text", () => {
    expect(escapeRegExp("hello world")).toBe("hello world");
    expect(escapeRegExp("")).toBe("");
  });
});
