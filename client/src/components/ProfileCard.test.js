import { describe, it, expect } from "vitest";
import { COLOR_TAGS, AVATAR_ICONS } from "./ProfileCard";

describe("ProfileCard color tags and avatar icons constants", () => {
  it("defines 5 valid color tag entries with accessible styling", () => {
    expect(Object.keys(COLOR_TAGS)).toHaveLength(5);
    expect(COLOR_TAGS).toHaveProperty("emerald");
    expect(COLOR_TAGS).toHaveProperty("cobalt");
    expect(COLOR_TAGS).toHaveProperty("rose");
    expect(COLOR_TAGS).toHaveProperty("gold");
    expect(COLOR_TAGS).toHaveProperty("purple");
  });

  it("defines 5 valid avatar icon components", () => {
    expect(Object.keys(AVATAR_ICONS)).toHaveLength(5);
    expect(AVATAR_ICONS).toHaveProperty("user");
    expect(AVATAR_ICONS).toHaveProperty("briefcase");
    expect(AVATAR_ICONS).toHaveProperty("heart");
    expect(AVATAR_ICONS).toHaveProperty("book");
    expect(AVATAR_ICONS).toHaveProperty("sparkles");
  });
});
