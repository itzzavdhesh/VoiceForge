import { describe, it, expect } from "vitest";
import { getPhraseCategory } from "./FavoriteMessages";

describe("getPhraseCategory inference utility", () => {
  it("categorizes question phrases with a question mark or interrogative lead word", () => {
    expect(getPhraseCategory("What time is it?")).toBe("questions");
    expect(getPhraseCategory("How can I help you")).toBe("questions");
    expect(getPhraseCategory("Where are we going")).toBe("questions");
  });

  it("categorizes urgent needs and medical request phrases", () => {
    expect(getPhraseCategory("I need water please")).toBe("needs");
    expect(getPhraseCategory("Emergency doctor help")).toBe("needs");
    expect(getPhraseCategory("I have pain in my arm")).toBe("needs");
  });

  it("categorizes greetings and thank you phrases", () => {
    expect(getPhraseCategory("Hello good morning!")).toBe("greetings");
    expect(getPhraseCategory("Thank you so much")).toBe("greetings");
    expect(getPhraseCategory("Goodbye see you later")).toBe("greetings");
  });

  it("categorizes general phrases under social category", () => {
    expect(getPhraseCategory("That sounds great!")).toBe("social");
    expect(getPhraseCategory("Working on VoiceForge project")).toBe("social");
  });
});
