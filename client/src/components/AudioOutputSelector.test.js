import { describe, it, expect } from "vitest";
import {
  getSelectedAudioOutput,
  setSelectedAudioOutput,
  getAudioOutputDevices,
  applyAudioOutput,
  AUDIO_OUTPUT_KEY,
} from "../utils/audioOutput";

describe("audioOutput utility module", () => {
  it("manages localStorage audio output device state", () => {
    setSelectedAudioOutput("test-device-123");
    expect(getSelectedAudioOutput()).toBe("test-device-123");

    setSelectedAudioOutput("");
    expect(getSelectedAudioOutput()).toBe("");
  });

  it("handles getAudioOutputDevices safely in test environment", async () => {
    const devices = await getAudioOutputDevices();
    expect(Array.isArray(devices)).toBe(true);
  });

  it("handles applyAudioOutput safely on audio elements without setSinkId", async () => {
    const fakeAudio = {};
    const result = await applyAudioOutput(fakeAudio, "test-device");
    expect(result).toBe(false);
  });
});
