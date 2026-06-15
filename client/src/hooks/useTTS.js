import React from "react";
import { getApiKey } from "../utils/apiKeyStorage.js";
import { loadVoiceSettings } from "../utils/voiceSettings.js";

export default function useTTS() {
  const [status, setStatus] = React.useState("idle");
  const [error, setError] = React.useState("");
  const [audioUrl, setAudioUrl] = React.useState("");
  const [engine, setEngine] = React.useState("elevenlabs");

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

  async function speak({ text, voiceId, language_code }) {
  setError("");
  setStatus("speaking");

  try {
    const voiceSettings = loadVoiceSettings();

    const apiKey = getApiKey();
    const response = await fetch("/api/voice/speak", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ElevenLabs-Api-Key": apiKey,
      },
      body: JSON.stringify({
        text,
        voice_id: voiceId,
        language_code,
        voice_settings: voiceSettings,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Speech generation failed.");
    }

    const payload = await response.json();
    const nextAudioUrl = payload.audioUrl;

    setEngine("elevenlabs");
    setAudioUrl(nextAudioUrl);
    setStatus("ready");

    return {
      audioUrl: nextAudioUrl,
      engine: "elevenlabs",
    };
  } catch (ttsError) {
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
