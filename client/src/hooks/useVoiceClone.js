// Provides a small client-side API for uploading a recording and saving cloned voice profiles.
import React from "react";
import { getAllProfiles, saveProfile, deleteProfile, clearStorage } from "../utils/db.js";
import { authFetch } from "../utils/auth.js";

// Fix (Issue 2): must match the server-side Multer limit in server/middleware/upload.js.
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12 MB

const ACTIVE_KEY = "voiceforge:activeVoiceId";

export function getSavedProfiles() {
  return getAllProfiles();
}

export async function syncVoices() {
  try {
    const res = await authFetch("/api/voices");
    if (!res.ok) return;
    const remoteVoices = await res.json();

    const localProfiles = await getAllProfiles();
    const localIds = new Set(localProfiles.map(p => p.voice_id));

    for (const remote of remoteVoices) {
      if (!localIds.has(remote.voice_id)) {
        const detailRes = await authFetch(`/api/voices/${remote.voice_id}`);
        if (detailRes.ok) {
          const detail = await detailRes.json();
          let audioBlob = null;
          if (detail.audio_base64) {
            const binary = atob(detail.audio_base64);
            const array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              array[i] = binary.charCodeAt(i);
            }
            audioBlob = new Blob([array], { type: "audio/webm" });
          }
          const profile = {
            id: detail.voice_id,
            voice_id: detail.voice_id,
            name: detail.name,
            ownerToken: detail.owner_token,
            createdAt: detail.created_at,
            audioBlob
          };
          await saveProfile(profile);
        }
      }
    }

    const remoteIds = new Set(remoteVoices.map(r => r.voice_id));
    for (const local of localProfiles) {
      if (!remoteIds.has(local.voice_id)) {
        const formData = new FormData();
        formData.append("voice_id", local.voice_id);
        formData.append("name", local.name);
        if (local.ownerToken) {
          formData.append("owner_token", local.ownerToken);
        }
        if (local.audioBlob) {
          formData.append("audio", local.audioBlob, "voiceforge-reference.webm");
        }
        await authFetch("/api/voices", {
          method: "POST",
          body: formData
        });
      }
    }

    window.dispatchEvent(new CustomEvent("voiceforge:profileChanged"));
  } catch (error) {
    console.error("Failed to sync voices:", error);
  }
}

export async function saveVoiceProfile(profile, audioBlob = null) {
  const profiles = await getSavedProfiles();
  const nextProfile = {
    id: profile.voice_id,
    voice_id: profile.voice_id,
    name: profile.name || `Voice ${profiles.length + 1}`,
    // Fix (Broken Voice Synthesis): persist the owner_token returned by
    // POST /api/voice/clone alongside the profile. The server now requires
    // this token on /api/voice/speak to prove ownership of voice_id, so it
    // must be retrievable later from the saved profile, not just held in
    // memory during the clone flow.
    ownerToken: profile.ownerToken || profile.owner_token || null,
    createdAt: new Date().toISOString(),
    audioBlob // Store the binary reference audio Blob
  };
  await saveProfile(nextProfile);

  // Sync to database
  try {
    const formData = new FormData();
    formData.append("voice_id", nextProfile.voice_id);
    formData.append("name", nextProfile.name);
    if (nextProfile.ownerToken) {
      formData.append("owner_token", nextProfile.ownerToken);
    }
    if (audioBlob) {
      formData.append("audio", audioBlob, "voiceforge-reference.webm");
    }
    await authFetch("/api/voices", {
      method: "POST",
      body: formData
    });
  } catch (err) {
    console.error("Failed to sync voice profile to database:", err);
  }

  localStorage.setItem(ACTIVE_KEY, nextProfile.voice_id);
  window.dispatchEvent(new CustomEvent("voiceforge:profileChanged"));
  return nextProfile;
}

export async function deleteVoiceProfile(voiceId) {
  await deleteProfile(voiceId);
  try {
    await authFetch(`/api/voices/${voiceId}`, {
      method: "DELETE"
    });
  } catch (err) {
    console.error("Failed to delete voice profile from server:", err);
  }
  const nextProfiles = await getSavedProfiles();
  if (localStorage.getItem(ACTIVE_KEY) === voiceId) {
    localStorage.setItem(ACTIVE_KEY, nextProfiles[0]?.voice_id || "");
  }
  window.dispatchEvent(new CustomEvent("voiceforge:profileChanged"));
  return nextProfiles;
}

export async function clearAllVoiceProfiles() {
  await clearStorage();
  try {
    await authFetch("/api/voices", {
      method: "DELETE"
    });
  } catch (err) {
    console.error("Failed to delete all voice profiles from server:", err);
  }
  localStorage.setItem(ACTIVE_KEY, "");
  window.dispatchEvent(new CustomEvent("voiceforge:profileChanged"));
  return [];
}

export async function getActiveVoiceProfile() {
  const profiles = await getSavedProfiles();
  const activeVoiceId = localStorage.getItem(ACTIVE_KEY);
  return profiles.find((profile) => profile.voice_id === activeVoiceId) || profiles[0] || null;
}

export default function useVoiceClone() {
  const [status, setStatus] = React.useState("idle");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    syncVoices();
  }, []);

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

      const response = await authFetch("/api/voice/clone", {
        method: "POST",
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

      // Fix (Broken Voice Synthesis): forward the owner_token returned by
      // the server into saveVoiceProfile so it lands in the stored profile
      // (see ownerToken field above) instead of being silently dropped.
      const profile = await saveVoiceProfile({
        voice_id: payload.voice_id,
        owner_token: payload.owner_token,
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
