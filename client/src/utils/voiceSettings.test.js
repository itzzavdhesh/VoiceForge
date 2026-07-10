import { describe, it, expect, beforeEach } from "vitest";
import {
  VOICE_PRESETS,
  DEFAULT_VOICE_SETTINGS,
  loadVoiceSettings,
  persistVoiceSettings,
  VOICE_SETTINGS_KEY,
} from "./voiceSettings.js";

// Mock localStorage globally for node-based vitest environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    clear: () => { store = {}; },
    removeItem: (key) => { delete store[key]; },
  };
})();
global.localStorage = localStorageMock;

describe("voiceSettings utility", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("exports the correct VOICE_PRESETS", () => {
    expect(VOICE_PRESETS).toBeDefined();
    expect(VOICE_PRESETS.neutral).toEqual({
      name: "Narrator / Neutral",
      stability: 0.70,
      temperature: 0.60,
      style: 0.30,
      dspPitch: 1.0,
      dspSpeed: 1.0,
      dspBass: 0.0,
      dspMid: 0.0,
      dspTreble: 0.0,
    });
    expect(VOICE_PRESETS.excited).toEqual({
      name: "Excited / Energetic",
      stability: 0.40,
      temperature: 0.95,
      style: 0.75,
      dspPitch: 1.10,
      dspSpeed: 1.15,
      dspBass: -2.0,
      dspMid: 1.0,
      dspTreble: 4.0,
    });
    expect(VOICE_PRESETS.robotic).toEqual({
      name: "Robotic / Flat",
      stability: 0.95,
      temperature: 0.10,
      style: 0.05,
      dspPitch: 0.90,
      dspSpeed: 0.95,
      dspBass: 2.0,
      dspMid: -3.0,
      dspTreble: -2.0,
    });
    expect(VOICE_PRESETS.soft).toEqual({
      name: "Soft / Whispering",
      stability: 0.55,
      temperature: 0.50,
      style: 0.20,
      dspPitch: 1.05,
      dspSpeed: 0.85,
      dspBass: -4.0,
      dspMid: 2.0,
      dspTreble: 2.0,
    });
  });

  it("loads default settings when localStorage is empty", () => {
    const settings = loadVoiceSettings();
    expect(settings).toEqual(DEFAULT_VOICE_SETTINGS);
  });

  it("loads saved settings from localStorage", () => {
    const customSettings = {
      stability: 0.88,
      temperature: 0.77,
      style: 0.66,
      dspPitch: 1.0,
      dspSpeed: 1.0,
      dspBass: 0.0,
      dspMid: 0.0,
      dspTreble: 0.0,
    };
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(customSettings));
    const loaded = loadVoiceSettings();
    expect(loaded).toEqual(customSettings);
  });

  it("clamps out of bounds values", () => {
    const invalidSettings = {
      stability: 1.5,
      temperature: -0.5,
      style: 0.5,
      dspPitch: 3.0,
      dspSpeed: 0.1,
      dspBass: 20.0,
      dspMid: -15.0,
      dspTreble: 0.0,
    };
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(invalidSettings));
    const loaded = loadVoiceSettings();
    expect(loaded.stability).toBe(1.0);
    expect(loaded.temperature).toBe(0.0);
    expect(loaded.style).toBe(0.5);
    expect(loaded.dspPitch).toBe(1.5);
    expect(loaded.dspSpeed).toBe(0.5);
    expect(loaded.dspBass).toBe(10.0);
    expect(loaded.dspMid).toBe(-10.0);
    expect(loaded.dspTreble).toBe(0.0);
  });
});
