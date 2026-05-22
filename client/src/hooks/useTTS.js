// Sends typed text to the local backend and returns playable cloned speech audio.
import React from "react";
export default function useTTS() {
  const [status, setStatus] = React.useState("idle");
  const [error, setError] = React.useState("");
  const [audioUrl, setAudioUrl] = React.useState("");

  async function speak({ text, voiceId }) {
    setError("");
    setStatus("speaking");

    try {
      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ElevenLabs-Api-Key": localStorage.getItem("voiceforge:elevenlabsApiKey") || ""
        },
        body: JSON.stringify({ text, voice_id: voiceId })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Speech generation failed.");
      }

      const audioBlob = await response.blob();
      const nextAudioUrl = URL.createObjectURL(audioBlob);
      setAudioUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return nextAudioUrl;
      });
      setStatus("ready");
      return { audioBlob, audioUrl: nextAudioUrl };
    } catch (ttsError) {
      setError(ttsError.message);
      setStatus("error");
      throw ttsError;
    }
  }

  React.useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return { speak, status, error, audioUrl };
}
