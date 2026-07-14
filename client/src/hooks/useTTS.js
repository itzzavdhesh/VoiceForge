import React from "react";
import { loadVoiceSettings } from "../utils/voiceSettings.js";
import { getSavedProfiles, saveVoiceProfile } from "./useVoiceClone.js";

/**
 * React hook that manages Text-to-Speech (TTS) generation state.
 * Interfaces with the local VoiceForge backend for Chatterbox synthesis,
 * and falls back to browser SpeechSynthesis if the server is offline or fails.
 *
 * @returns {object} The TTS state and the speak action function.
 */
export default function useTTS() {
  const [status, setStatus] = React.useState("idle");
  const [error, setError] = React.useState("");
  const [audioUrl, setAudioUrl] = React.useState("");
  const [engine, setEngine] = React.useState("chatterbox");
  const abortControllerRef = React.useRef(null);

  /**
   * Triggers local browser SpeechSynthesis as a fallback engine.
   *
   * @param {string} text The text to read.
   * @param {string} languageCode BCP-47 language tag to use.
   * @returns {Promise<void>} Resolves when speech completes.
   */
  function browserSpeak(text, languageCode) {
    return new Promise((resolve, reject) => {
      if (!("speechSynthesis" in window)) {
        reject(new Error("Speech synthesis not supported"));
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      if (languageCode) {
        utterance.lang = languageCode;
      }

      utterance.onend = resolve;
      utterance.onerror = reject;

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Resolves the owner_token that authorizes use of a given voice_id, by
   * looking up the locally saved voice profile that matches voiceId.
   *
   * @param {string} voiceId The voice_id to resolve an owner_token for.
   * @returns {Promise<object|null>} The matching saved profile, or null.
   */
  async function findProfileByVoiceId(voiceId) {
    if (!voiceId) {
      return null;
    }
    const profiles = await getSavedProfiles();
    return profiles.find((profile) => profile.voice_id === voiceId) || null;
  }

  /**
   * Generates cloned speech for the given text using the selected voice profile.
   * Automatically attempts browser SpeechSynthesis fallback if the server request fails.
   *
   * @param {object} params Parameter payload.
   * @param {string} params.text The text to synthesize.
   * @param {string} params.voiceId The ID of the cloned voice profile.
   * @param {string} [params.language_code] Chatterbox/BCP-47 language code.
   * @param {string} [params.ownerToken] Owner token for voiceId. If omitted,
   *   it is looked up from the locally saved profile matching voiceId.
   * @returns {Promise<{audioUrl: string, engine: string}|{fallback: boolean, engine: string}>} Result of speech synthesis.
   */
  async function speak({ text, voiceId, language_code, ownerToken }) {
    // Cancel any in-flight request before starting a new one.
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setError("");
    setStatus("speaking");

    try {
      const voiceSettings = loadVoiceSettings();

      // Fix (Broken Voice Synthesis): the server now requires owner_token to
      // authorize use of voice_id (403 otherwise). Use the explicitly
      // passed token if given, else resolve it from the saved profile.
      let activeVoiceId = voiceId;
      let resolvedOwnerToken = ownerToken || (await findProfileByVoiceId(voiceId))?.ownerToken || null;

      let response = await fetch("/api/voice/speak", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice_id: activeVoiceId,
          owner_token: resolvedOwnerToken,
          language_code,
          voice_settings: voiceSettings,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        // If voice profile is missing on the backend (404), trigger auto-reclone from IndexedDB
        if (response.status === 404 && (payload.error || "").includes("Voice profile not found")) {
          const profile = await findProfileByVoiceId(voiceId);
          if (profile && profile.audioBlob) {
            const formData = new FormData();
            formData.append("audio", profile.audioBlob, "voiceforge-reference.webm");
            formData.append("name", profile.name);

            const cloneResponse = await fetch("/api/voice/clone", {
              method: "POST",
              body: formData,
            });

            if (cloneResponse.ok) {
              const clonePayload = await cloneResponse.json();

              // Fix (Broken Voice Synthesis): cloneVoice() always mints a
              // brand-new voice_id/owner_token pair server-side — it does
              // NOT reuse the old voice_id, even if we sent one. Retrying
              // with the stale voiceId/resolvedOwnerToken here would just
              // 403/404 again. Persist the new pair locally (this also
              // updates the active-voice pointer) and use the new pair for
              // the retry below.
              const updatedProfile = await saveVoiceProfile(
                {
                  voice_id: clonePayload.voice_id,
                  owner_token: clonePayload.owner_token,
                  name: clonePayload.name || profile.name,
                },
                profile.audioBlob
              );

              activeVoiceId = updatedProfile.voice_id;
              resolvedOwnerToken = updatedProfile.ownerToken;

              // Retry the speak request after silent re-cloning succeeds
              response = await fetch("/api/voice/speak", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  text,
                  voice_id: activeVoiceId,
                  owner_token: resolvedOwnerToken,
                  language_code,
                  voice_settings: voiceSettings,
                }),
              });
            }
          }
        }
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Speech generation failed.");
      }

      const payload = await response.json();
      const nextAudioUrl = payload.audioUrl;

      setEngine("chatterbox");
      setAudioUrl(nextAudioUrl);
      setStatus("ready");

      return {
        audioUrl: nextAudioUrl,
        engine: "chatterbox",
      };
    } catch (ttsError) {
      // A cancelled request is not an error — a newer speak() call took over.
      if (ttsError?.name === "AbortError") {
        return;
      }

      try {
        await browserSpeak(text, language_code);

        setEngine("browser");
        setAudioUrl("");
        setStatus("ready");

        return {
          fallback: true,
          engine: "browser",
        };
      } catch {
        setError(ttsError?.message || String(ttsError));
        setStatus("error");
        throw ttsError;
      }
    }
  }

  return {
    speak,
    status,
    error,
    audioUrl,
    engine,
  };
}