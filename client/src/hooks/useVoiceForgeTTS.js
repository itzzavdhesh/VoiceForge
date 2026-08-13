import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * useVoiceForgeTTS
 * -----------------------------------------------------------------------
 * Track 1 scaffold (issue #253): turns typed text into speech entirely
 * client-side, with zero network calls and zero audio sent to a server.
 *
 * This first version wraps the browser's built-in Web Speech API
 * (SpeechSynthesis) so the feature works today, in any modern browser,
 * with no model downloads. The hook's return shape is intentionally
 * small and stable so a future PR can swap the implementation for an
 * ONNX Runtime Web + WebGPU model without changing any component that
 * consumes this hook.
 *
 * Why start here instead of ONNX:
 *  - Web Speech API ships in-browser today, no WASM/model loading required.
 *  - Lets the rest of the pipeline (UI, shortcuts, call integration) get
 *    built and tested against a stable interface immediately.
 *  - The local-first / privacy property already holds: SpeechSynthesis
 *    runs in the OS/browser speech engine, nothing leaves the device.
 *
 * Future work (tracked separately, not in this PR):
 *  - Swap engine internals for an ONNX TTS model run via onnxruntime-web
 *    with the WebGPU execution provider, for consistent cross-browser
 *    voice quality and to enable few-shot voice cloning (Track 1, part 2).
 *
 * Usage:
 *   const { speak, cancel, voices, isSpeaking, setVoiceName, rate, setRate } = useVoiceForgeTTS();
 *   await speak("Hello, this is spoken locally.");
 */
export function useVoiceForgeTTS(initialOptions = {}) {
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const [voices, setVoices] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(!!synthRef.current);
  const [error, setError] = useState(null);

  const [voiceName, setVoiceName] = useState(initialOptions.voiceName || null);
  const [rate, setRate] = useState(initialOptions.rate ?? 1);
  const [pitch, setPitch] = useState(initialOptions.pitch ?? 1);
  const [volume, setVolume] = useState(initialOptions.volume ?? 1);

  // Load voices, handling the async `voiceschanged` event some browsers fire.
  useEffect(() => {
    const synth = synthRef.current;
    if (!synth) {
      setIsSupported(false);
      return;
    }

    const populate = () => {
      const list = synth.getVoices();
      if (list.length > 0) setVoices(list);
    };

    populate();
    synth.addEventListener('voiceschanged', populate);
    return () => synth.removeEventListener('voiceschanged', populate);
  }, []);

  const speak = useCallback(
    (text) => {
      const synth = synthRef.current;
      if (!synth) {
        const err = new Error('SpeechSynthesis is not supported in this browser.');
        setError(err);
        return Promise.reject(err);
      }
      if (!text || !text.trim()) {
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text);

        const chosenVoice = voices.find((v) => v.name === voiceName);
        if (chosenVoice) utterance.voice = chosenVoice;

        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = (e) => {
          setIsSpeaking(false);
          setError(e);
          reject(e);
        };

        synth.speak(utterance);
      });
    },
    [voices, voiceName, rate, pitch, volume]
  );

  const cancel = useCallback(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  }, []);

  const pause = useCallback(() => synthRef.current?.pause(), []);
  const resume = useCallback(() => synthRef.current?.resume(), []);

  return {
    speak,
    cancel,
    pause,
    resume,
    voices,
    isSpeaking,
    isSupported,
    error,
    voiceName,
    setVoiceName,
    rate,
    setRate,
    pitch,
    setPitch,
    volume,
    setVolume,
  };
}

export default useVoiceForgeTTS;