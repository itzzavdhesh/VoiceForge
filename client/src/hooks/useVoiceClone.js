// Provides a small client-side API for uploading a recording and saving cloned voice profiles.
import React from "react";
const PROFILE_KEY = "voiceforge:profiles";
const ACTIVE_KEY = "voiceforge:activeVoiceId";

export function getSavedProfiles() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveVoiceProfile(profile) {
  const profiles = getSavedProfiles();
  const nextProfile = {
    id: profile.voice_id,
    voice_id: profile.voice_id,
    name: profile.name || `Voice ${profiles.length + 1}`,
    createdAt: new Date().toISOString()
  };
  const nextProfiles = [nextProfile, ...profiles.filter((item) => item.voice_id !== nextProfile.voice_id)];
  localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfiles));
  localStorage.setItem(ACTIVE_KEY, nextProfile.voice_id);
  return nextProfile;
}

export function deleteVoiceProfile(voiceId) {
  const nextProfiles = getSavedProfiles().filter((profile) => profile.voice_id !== voiceId);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfiles));
  if (localStorage.getItem(ACTIVE_KEY) === voiceId) {
    localStorage.setItem(ACTIVE_KEY, nextProfiles[0]?.voice_id || "");
  }
  return nextProfiles;
}

export function getActiveVoiceProfile() {
  const profiles = getSavedProfiles();
  const activeVoiceId = localStorage.getItem(ACTIVE_KEY);
  return profiles.find((profile) => profile.voice_id === activeVoiceId) || profiles[0] || null;
}

export default function useVoiceClone() {
  const [status, setStatus] = React.useState("idle");
  const [error, setError] = React.useState("");

  async function cloneVoice(audioBlob, name = "VoiceForge profile") {
    setStatus("cloning");
    setError("");

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "voiceforge-reference.webm");
      formData.append("name", name);

      const response = await fetch("/api/voice/clone", {
        method: "POST",
        headers: {
          "X-ElevenLabs-Api-Key": localStorage.getItem("voiceforge:elevenlabsApiKey") || ""
        },
        body: formData
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Voice cloning failed.");
      }

      const profile = saveVoiceProfile({
        voice_id: payload.voice_id,
        name: payload.name || name
      });
      setStatus("success");
      return profile;
    } catch (cloneError) {
      setError(cloneError.message);
      setStatus("error");
      throw cloneError;
    }
  }

  return { cloneVoice, status, error };
}
