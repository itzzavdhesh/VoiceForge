// Sends typed text to the local backend and returns playable cloned speech audio.
import React from "react";
import { getApiKey } from "../utils/apiKeyStorage.js";
import { loadVoiceSettings } from "../utils/voiceSettings.js";
import { API_BASE_URL } from "../utils/apiConfig.js";

export default function useTTS() {
  const [status, setStatus] = React.useState("idle");
  const [error, setError] = React.useState("");
  const [audioUrl, setAudioUrl] = React.useState("");
  const prevBlobRef = React.useRef("");
  const mountedRef = React.useRef(true);

    setError("");
    setStatus("speaking"); 

    try {
      const voiceSettings = loadVoiceSettings();

      const modelId = localStorage.getItem("voiceforge:selectedModelId") || "eleven_multilingual_v2";
      const apiKey = localStorage.getItem("voiceforge:elevenlabsApiKey") || "";
      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ElevenLabs-Api-Key": apiKey,
        },
        body: JSON.stringify({
          text,
          voice_id: voiceId,
          voice_settings: voiceSettings,
          model_id: modelId
        })
      });

      if (controller.signal.aborted) {
        return { aborted: true };
      }

      if (response.status === 404) {
        // Self-healing fallback:
        // 1. Look up the voice profile in IndexedDB
        const profile = await getProfile(voiceId);
        if (profile && profile.audioBlob) {
          if (controller.signal.aborted) {
            return { aborted: true };
          }
          // 2. Quietly re-clone (POST /api/voice/clone)
          const formData = new FormData();
          formData.append(
            "audio",
            profile.audioBlob,
            "voiceforge-reference.webm",
          );
          formData.append("name", profile.name);
          formData.append("voice_id", voiceId);

          const cloneResponse = await authFetch("/api/voice/clone", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });

          if (controller.signal.aborted) {
            return { aborted: true };
          }

          if (cloneResponse.ok) {
            // 3. Retry the speak request
            response = await authFetch("/api/voice/speak", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text,
                voice_id: voiceId,
                owner_token: resolvedOwnerToken,
                language_code,
                voice_settings: voiceSettings,
              }),
              signal: controller.signal,
            });
          }
        }
      }

      if (controller.signal.aborted) {
        return { aborted: true };
      }

      if (!response.ok) {
        // Safely parse the error body — it may not be JSON if the server is
        // misbehaving, so fall back gracefully.
        const payload = await response.json().catch(() => ({}));
        // If voice profile is missing on the backend (404), trigger auto-reclone from IndexedDB
        if (
          response.status === 404 &&
          (payload.error || "").includes("Voice profile not found")
        ) {
          const profile = await findProfileByVoiceId(voiceId);
          if (profile && profile.audioBlob) {
            if (controller.signal.aborted) {
              return { aborted: true };
            }
            const formData = new FormData();
            formData.append(
              "audio",
              profile.audioBlob,
              "voiceforge-reference.webm",
            );
            formData.append("name", profile.name);

            const cloneResponse = await authFetch("/api/voice/clone", {
              method: "POST",
              body: formData,
              signal: controller.signal,
            });

            if (controller.signal.aborted) {
              return { aborted: true };
            }

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
                profile.audioBlob,
              );

              activeVoiceId = updatedProfile.voice_id;
              resolvedOwnerToken = updatedProfile.ownerToken;

              if (controller.signal.aborted) {
                return { aborted: true };
              }

              // Retry the speak request after silent re-cloning succeeds
              response = await authFetch("/api/voice/speak", {
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
                signal: controller.signal,
              });
            }
          }
        }
      }

      if (controller.signal.aborted) {
        return { aborted: true };
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (payload.status === "waking_up") {
          const err = new Error("Waking up AI Engine... this may take a minute.");
          err.isColdStart = true;
          throw err;
        }
        throw new Error(payload.error || "Speech generation failed.");
      }

      const payload = await response.json();
      const nextAudioUrl = payload.audioUrl;

        if (!nextAudioUrl) {
          throw new Error("Audio URL missing from server response.");
        }

        let blobUrl = "";
        try {
        const audioResponse = await fetch(nextAudioUrl);
        if (audioResponse.ok) {
          const blob = await audioResponse.blob();
          const created = URL.createObjectURL(blob);
          if (!mountedRef.current) {
            URL.revokeObjectURL(created);   // fix: revoke before bailing
            return { audioUrl: "", blobUrl: "" };
          }
          blobUrl = created;
        }
      } catch {
        // Blob capture failed — download button won't appear.
      }

      if (!mountedRef.current) return { audioUrl: "", blobUrl: "" };


      if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current);
      prevBlobRef.current = blobUrl;
      setAudioUrl(blobUrl || nextAudioUrl);
      setStatus("ready");
      return { audioUrl: blobUrl || nextAudioUrl, blobUrl };
    } catch (ttsError) {
      // A cancelled request is not an error — a newer speak() call took over.
      if (ttsError?.name === "AbortError") {
        return;
      }

      try {
        if (onSpeakingChange) onSpeakingChange(true);
        await browserSpeak(text, language_code);
        if (onSpeakingChange) onSpeakingChange(false);

        setEngine("browser");
        setAudioUrl("");
        setStatus("ready");

        return {
          fallback: true,
          engine: "browser",
        };
      } catch (browserError) {
        if (onSpeakingChange) onSpeakingChange(false);
        setError(ttsError?.message || String(ttsError));
        setStatus("error");
        throw ttsError;
      }
    }
  }
    React.useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        if (prevBlobRef.current) {
          URL.revokeObjectURL(prevBlobRef.current);
        }
      };
    }, []);
  return { speak, status, error, audioUrl };
}
