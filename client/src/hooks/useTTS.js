// Sends typed text to the local backend and returns playable cloned speech audio.
import React from "react";
import { getApiKey } from "../utils/apiKeyStorage.js";

export default function useTTS() {
  const [status, setStatus] = React.useState("idle");
  const [error, setError] = React.useState("");
  const [audioUrl, setAudioUrl] = React.useState("");
  const prevBlobRef = React.useRef("");
  const mountedRef = React.useRef(true);

  async function speak({ text, voiceId }) {
    setError("");
    setStatus("speaking"); 

    try {
      const defaultSettings = { stability: 0.45, similarity_boost: 0.8, style: 0.2 };
      let voiceSettings;
      try {
        voiceSettings = JSON.parse(localStorage.getItem("voiceforge:voiceSettings")) || defaultSettings;
      } catch {
        voiceSettings = defaultSettings;
      }

      const apiKey = getApiKey();
      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ElevenLabs-Api-Key": apiKey,
        },
        body: JSON.stringify({ text, voice_id: voiceId, voice_settings: voiceSettings })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
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

      // fix: fail fast if nothing usable came back
      if (!blobUrl && !nextAudioUrl) {
        setError("Audio URL unavailable.");
        setStatus("error");
        return { audioUrl: "", blobUrl: "" };
      }

      if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current);
      prevBlobRef.current = blobUrl;
      setAudioUrl(blobUrl || nextAudioUrl);
      setStatus("ready");
      return { audioUrl: blobUrl || nextAudioUrl, blobUrl };
    } catch (ttsError) {
      setError(ttsError?.message || String(ttsError));
      setStatus("error");
      throw ttsError;
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
