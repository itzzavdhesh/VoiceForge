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

  const speak = React.useCallback(async (text, voiceId, languageCode = "en") => {
    const controller = new AbortController();
    setError("");
    setStatus("speaking");

    try {
      const voiceSettings = loadVoiceSettings();
      const modelId = localStorage.getItem("voiceforge:selectedModelId") || "eleven_multilingual_v2";
      const apiKey = getApiKey() || localStorage.getItem("voiceforge:elevenlabsApiKey") || "";

      const response = await fetch(`${API_BASE_URL}/api/voice/speak`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ElevenLabs-Api-Key": apiKey,
        },
        body: JSON.stringify({
          text,
          voice_id: voiceId,
          voice_settings: voiceSettings,
          model_id: modelId,
          language_code: languageCode,
        }),
        signal: controller.signal,
      });

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
            URL.revokeObjectURL(created);
            return { audioUrl: "", blobUrl: "" };
          }
          blobUrl = created;
        }
      } catch {
        // Blob capture failed — fallback to direct URL
      }

      if (!mountedRef.current) return { audioUrl: "", blobUrl: "" };

      if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current);
      prevBlobRef.current = blobUrl;
      setAudioUrl(blobUrl || nextAudioUrl);
      setStatus("ready");
      return { audioUrl: blobUrl || nextAudioUrl, blobUrl };
    } catch (ttsError) {
      if (ttsError?.name === "AbortError") {
        return;
      }
      setError(ttsError?.message || String(ttsError));
      setStatus("error");
      throw ttsError;
    }
  }, []);

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
