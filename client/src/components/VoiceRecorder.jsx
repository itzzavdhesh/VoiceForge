// Handles microphone permission, short reference recording, playback, and upload readiness.
import React from "react";
import { Mic, Square, Upload, CircleAlert, Loader2, FileUp } from "lucide-react";
import { extractAudioFromFile } from "../utils/audioExtractor.js";

const MAX_RECORDING_SECONDS = 300; // 5 minute max recording cap

export default function VoiceRecorder({ onRecordingReady, disabled = false }) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [isInitializing, setIsInitializing] = React.useState(false);
  const [audioUrl, setAudioUrl] = React.useState("");
  const [duration, setDuration] = React.useState(0);
  const durationRef = React.useRef(0);
  const [recorderError, setRecorderError] = React.useState("");
  const [isExtracting, setIsExtracting] = React.useState(false);
  
  const fileInputRef = React.useRef(null);
  const recorderRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const chunksRef = React.useRef([]);
  const timerRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const isMountedRef = React.useRef(true);
  const [barHeights, setBarHeights] = React.useState([18, 30, 42, 30, 18]);
  const analyserRef = React.useRef(null);
  const audioCtxRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const errorTimerRef = React.useRef(null);
  const didFinalizeRef = React.useRef(false);

  // Common stop cleanup function
  function handleStopCleanup({ emitReady = true } = {}) {
    if (didFinalizeRef.current) return;
    didFinalizeRef.current = true;

    window.clearInterval(timerRef.current);
    setIsRecording(false);

    // Stop stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn("Failed to stop track:", e);
        }
      });
      streamRef.current = null;
    }

    const hasRecordingData = chunksRef.current.some((chunk) => chunk.size > 0);
    if (!emitReady || !hasRecordingData) {
      onRecordingReady(null);
      return;
    }

    // Create the final audio Blob
    const blob = new Blob(chunksRef.current, {
      type: recorderRef.current?.mimeType || "audio/webm",
    });

    setRawAudioBlob(blob);

    const url = URL.createObjectURL(blob);
    setAudioUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return url;
    });

    onRecordingReady(blob, durationRef.current);
  }

  async function startRecording() {
    if (isInitializing || isRecording) return;
    didFinalizeRef.current = false;
    setIsInitializing(true);
    setRecorderError("");
    setDuration(0);
    durationRef.current = 0;
    setAudioUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return "";
    });
    onRecordingReady(null);
    setRawAudioBlob(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Detect support for audio/webm
      let mimeType = "audio/webm";
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (!MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = ""; // Let browser choose default format
        }
      }

      let recorder;
      try {
        if (mimeType) {
          recorder = new MediaRecorder(stream, { mimeType });
        } else {
          recorder = new MediaRecorder(stream);
        }
      } catch (mimeError) {
        try {
          recorder = new MediaRecorder(stream);
        } catch (fallbackError) {
          throw new Error("Recording format is not supported in this browser.");
        }
      }

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        window.clearInterval(timerRef.current);
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        setAudioUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return url;
        });
        const finalDuration = durationRef.current;
        onRecordingReady(blob, {
          duration: finalDuration,
          isValid: finalDuration >= MIN_DURATION,
        });
        streamRef.current?.getTracks().forEach((track) => track.stop());
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder runtime error:", event.error);
        if (!isMountedRef.current) return;
        setRecorderError(
          `Recording error: ${event.error?.message || "Unknown error"}`,
        );
        handleStopCleanup({ emitReady: false });
      };

      // Start recording with 250ms timeslice to ensure continuous chunk delivery
      recorder.start(250);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setDuration((prev) => {
          const next = prev + 1;
          durationRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err) {
      window.clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {}
        });
        streamRef.current = null;
      }
      setIsRecording(false);

      let friendlyMessage = err?.message || String(err);
      if (
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError"
      ) {
        friendlyMessage =
          "Microphone access denied. Please grant permission in your browser settings and try again.";
      } else if (
        err?.name === "NotFoundError" ||
        err?.name === "DevicesNotFoundError"
      ) {
        friendlyMessage =
          "No microphone found. Please connect an input device and try again.";
      }

      setRecorderError(friendlyMessage);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setRecorderError(""), 6000);
    } finally {
      setIsInitializing(false);
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsExtracting(true);
    setRecorderError("");
    try {
      const { blob, duration: fileDuration } = await extractAudioFromFile(file);
      setRawAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      setAudioUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
      onRecordingReady(blob);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };

    setDuration(0);
    timerRef.current = window.setInterval(
      () => setDuration((value) => value + 1),
      1000,
    );
    recorder.start();
    setIsRecording(true);
  }

  function stopRecording() {
    if (durationRef.current < MIN_DURATION) {
      const confirmStop = window.confirm(
        `Your recording is only ${durationRef.current} seconds. A minimum of ${MIN_DURATION} seconds is recommended for high-quality voice cloning. Stop recording anyway?`,
      );
      if (!confirmStop) return;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
    }
    recorderRef.current?.stop();
  }

  async function handleFileUpload(event) {
    const [file] = event.target.files || [];
    if (!file) return;

    try {
      setIsExtracting(true);
      setRecorderError("");
      const { blob, duration: extractedDuration } = await extractAudioFromFile(file);
      const normalizedDuration = Math.max(0, Math.round(extractedDuration));

      setRawAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      setAudioUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
      setDuration(normalizedDuration);
      durationRef.current = normalizedDuration;
      onRecordingReady(blob, { duration: normalizedDuration, isValid: normalizedDuration >= MIN_DURATION });
    } catch (err) {
      const friendlyMessage = err?.message || "Unable to process the selected file.";
      setRecorderError(friendlyMessage);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setRecorderError(""), 6000);
    } finally {
      setIsExtracting(false);
      event.target.value = "";
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset previous state
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl("");
    setRecorderError("");
    onRecordingReady(null);
    setDuration(0);
    durationRef.current = 0;
    
    setIsExtracting(true);
    
    try {
      const { blob, duration } = await extractAudioFromFile(file);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setDuration(duration);
      durationRef.current = duration;
      onRecordingReady(blob, duration);
    } catch (err) {
      setRecorderError(err.message || String(err));
    } finally {
      setIsExtracting(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
      window.clearInterval(timerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {}
        });
      }
    };
  }, []);

  React.useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  React.useEffect(() => {
    if (!isRecording) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        if (analyserRef.current) analyserRef.current.disconnect();
      } catch (e) {}
      try {
        if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
          audioCtxRef.current.close();
        }
      } catch (e) {}
      analyserRef.current = null;
      audioCtxRef.current = null;
      setBarHeights([18, 30, 42, 30, 18]);
      return;
    }

    const stream = streamRef.current;
    if (!stream) return;

    let cancelled = false;

    (async () => {
      try {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error("Web Audio API is not supported in this browser.");
        }
        const audioCtx = new AudioContextClass();
        await audioCtx.resume();
        if (cancelled) {
          audioCtx.close();
          return;
        }

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        audioCtxRef.current = audioCtx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const bucketSize = Math.floor(dataArray.length / 5);

        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(dataArray);
          const heights = Array.from({ length: 5 }, (_, i) => {
            const slice = dataArray.slice(i * bucketSize, (i + 1) * bucketSize);
            const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
            return Math.max(8, Math.round(Math.sqrt(avg / 255) * 48));
          });
          setBarHeights(heights);
          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        console.warn("Waveform animation unavailable:", err);
        setBarHeights([18, 30, 42, 30, 18]);
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        if (analyserRef.current) analyserRef.current.disconnect();
      } catch (e) {}
      try {
        if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
          audioCtxRef.current.close();
        }
      } catch (e) {}
      analyserRef.current = null;
      audioCtxRef.current = null;
    };
  }, [isRecording]);

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Record or upload a 10-second reference</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/70 dark:text-muted">
            Use your own voice or a trusted reference speaker with consent. Keep
            background noise low. You can also upload a video (.mp4, .mov) or audio file.
          </p>
        </div>
        <span className="rounded-md bg-mint px-3 py-1 text-sm font-semibold text-ink dark:bg-glow/15 dark:text-glow">
          {duration}s
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled}
          title={isRecording ? "Stop recording your voice" : "Start recording your voice"}
          aria-label={isRecording ? "Stop recording your voice" : "Start recording your voice"}
          className={`inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 font-bold text-white transition ${
            isRecording
              ? "bg-coral hover:bg-coral/90"
              : "bg-moss hover:bg-moss/90"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {isRecording ? (
            <Square size={18} aria-hidden="true" />
          ) : (
            <Mic size={18} aria-hidden="true" />
          )}
          {isRecording ? "Stop recording" : "Start recording"}
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isRecording || isInitializing || isExtracting}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-cloud px-5 py-3 font-bold text-ink transition hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        >
          {isExtracting ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <FileUp size={18} aria-hidden="true" />
          )}
          {isExtracting ? "Extracting..." : "Upload file"}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="audio/*,video/mp4,video/quicktime"
          className="hidden"
        />

        <div
          className="recording-wave flex h-12 flex-1 items-center gap-1 rounded-md border border-ink/10 bg-cloud px-4 dark:border-border dark:bg-black"
          aria-hidden="true"
        >
          {[18, 30, 42, 30, 18].map((height, index) => (
            <span
              key={height + index}
              className={`block w-2 rounded-full ${isRecording ? "bg-coral" : "bg-black/20 dark:bg-neutral-700"}`}
              style={{ height }}
            />
          ))}
        </div>

        {audioUrl && (
          <audio className="w-full max-w-sm" controls src={audioUrl}>
            <track kind="captions" />
          </audio>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-ink/60 dark:text-muted">
        <Upload size={16} aria-hidden="true" />
        Upload starts after you press "Clone voice".
      </div>
    </section>
  );
}
