// Provides a small client-side API for uploading a recording and saving cloned voice profiles.
import React from "react";
import { getAllProfiles, saveProfile, deleteProfile } from "../utils/db.js";
import { getApiKey } from "../utils/apiKeyStorage.js";

// Fix (Issue 2): must match the server-side Multer limit in server/middleware/upload.js.
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12 MB

const ACTIVE_KEY = "voiceforge:activeVoiceId";

export function getSavedProfiles() {
  return getAllProfiles();
}

export async function saveVoiceProfile(profile, audioBlob = null) {
  const profiles = await getSavedProfiles();
  const nextProfile = {
    id: profile.voice_id,
    voice_id: profile.voice_id,
    name: profile.name || `Voice ${profiles.length + 1}`,
    createdAt: new Date().toISOString(),
    audioBlob // Store the binary reference audio Blob
  };
  await saveProfile(nextProfile);
  localStorage.setItem(ACTIVE_KEY, nextProfile.voice_id);
  return nextProfile;
}

export async function deleteVoiceProfile(voiceId) {
  await deleteProfile(voiceId);
  const nextProfiles = await getSavedProfiles();
  if (localStorage.getItem(ACTIVE_KEY) === voiceId) {
    localStorage.setItem(ACTIVE_KEY, nextProfiles[0]?.voice_id || "");
  }
  return nextProfiles;
}

export async function getActiveVoiceProfile() {
  const profiles = await getSavedProfiles();
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
      // Fix (Issue 2): validate client-side before any network request so the
      // user gets instant, clear feedback instead of waiting for the full
      // upload to complete before Multer rejects it on the server.
      if (!audioBlob) {
        throw new Error("No audio recording found. Please record your voice first.");
      }
      if (!audioBlob.type.startsWith("audio/")) {
        throw new Error(
          `Unsupported file type "${audioBlob.type}". Please upload an audio recording.`
        );
      }
      if (audioBlob.size > MAX_UPLOAD_BYTES) {
        const sizeMB = (audioBlob.size / (1024 * 1024)).toFixed(1);
        throw new Error(
          `Recording is ${sizeMB} MB — the maximum allowed size is 12 MB. Please record a shorter clip.`
        );
      }

      const formData = new FormData();
      formData.append("audio", audioBlob, "voiceforge-reference.webm");
      formData.append("name", name);

      const apiKey = getApiKey();
      const response = await fetch("/api/voice/clone", {
        method: "POST",
        headers: { "X-ElevenLabs-Api-Key": apiKey },
        body: formData
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Could not connect to the VoiceForge server. Please ensure your local backend is running on port 3001.");
      }

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Voice cloning failed.");
      }

      const profile = await saveVoiceProfile({
        voice_id: payload.voice_id,
        name: payload.name || name
      }, audioBlob);

      setStatus("success");
      return profile;
    } catch (cloneError) {
      setError(cloneError?.message || String(cloneError));
      setStatus("error");
      throw cloneError;
    }
  }

  return { cloneVoice, status, error };
}
