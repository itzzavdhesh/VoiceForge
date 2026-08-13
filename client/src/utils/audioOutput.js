export const AUDIO_OUTPUT_KEY = "voiceforge:selectedAudioOutput";

let memoryStorage = "";

export function getSelectedAudioOutput() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return localStorage.getItem(AUDIO_OUTPUT_KEY) || memoryStorage;
    }
  } catch (e) {
    // Fallback to memory
  }
  return memoryStorage;
}

export function setSelectedAudioOutput(deviceId) {
  memoryStorage = deviceId || "";
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(AUDIO_OUTPUT_KEY, deviceId || "");
    }
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("voiceforge:audioOutputChanged", { detail: deviceId }));
    }
  } catch (e) {
    // Fallback to memory
  }
}

export async function getAudioOutputDevices() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return [];
  }

  try {
    let devices = await navigator.mediaDevices.enumerateDevices();
    let outputs = devices.filter((device) => device.kind === "audiooutput");

    // If device labels are blank, attempt a permission request to unlock hardware labels
    if (outputs.length > 0 && outputs.every((d) => !d.label)) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        devices = await navigator.mediaDevices.enumerateDevices();
        outputs = devices.filter((device) => device.kind === "audiooutput");
      } catch (permissionErr) {
        console.debug("Audio output permission unlock fallback:", permissionErr);
      }
    }

    return outputs.map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Audio Output Device ${index + 1}`,
    }));
  } catch (err) {
    console.error("Failed to enumerate audio output devices:", err);
    return [];
  }
}

export async function applyAudioOutput(audioElement, deviceId) {
  if (!audioElement) return false;
  const targetDeviceId = deviceId !== undefined ? deviceId : getSelectedAudioOutput();

  if (typeof audioElement.setSinkId === "function") {
    try {
      await audioElement.setSinkId(targetDeviceId || "");
      return true;
    } catch (err) {
      console.warn("Failed to setSinkId on audio element:", err);
      return false;
    }
  }
  return false;
}
