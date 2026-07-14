// Handles microphone permission, short reference recording, playback, and upload readiness.
import React from "react";
import { Mic, Square, Upload, CircleAlert, Loader2, FileUp } from "lucide-react";
import { extractAudioFromFile } from "../utils/audioExtractor.js";

const MIN_DURATION = 10;

export default function VoiceRecorder({ onRecordingReady, disabled = false }) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [isInitializing, setIsInitializing] = React.useState(false);
  const [audioUrl, setAudioUrl] = React.useState("");
  const [duration, setDuration] = React.useState(0);
  const durationRef = React.useRef(0);
  const [recorderError, setRecorderError] = React.useState("");
  const durationRef = React.useRef(0);
  const recorderRef = React.useRef(null);
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
      type: recorderRef.current?.mimeType || "audio/webm"
    });
    
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
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return url;
        });
        const finalDuration = durationRef.current;
        onRecordingReady(blob, { duration: finalDuration, isValid: finalDuration >= MIN_DURATION });
        streamRef.current?.getTracks().forEach((track) => track.stop());
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder runtime error:", event.error);
        if (!isMountedRef.current) return;
        setRecorderError(`Recording error: ${event.error?.message || "Unknown error"}`);
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
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        friendlyMessage = "Microphone access denied. Please grant permission in your browser settings and try again.";
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        friendlyMessage = "No microphone found. Please connect an input device and try again.";
      }

      setRecorderError(friendlyMessage);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setRecorderError(""), 6000);
    } finally {
      setIsInitializing(false);
    }
  }

  function stopRecording() {
    if (durationRef.current < MIN_DURATION) {
      const confirmStop = window.confirm(
        `Your recording is only ${durationRef.current} seconds. A minimum of ${MIN_DURATION} seconds is recommended for high-quality voice cloning. Stop recording anyway?`
      );
      if (!confirmStop) return;
    }
    recorderRef.current?.stop();
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
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
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

      {/* Progress Indicator */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-semibold text-ink/60 dark:text-muted mb-1.5">
          <span>Recording Progress</span>
          <span>{duration}s / {MIN_DURATION}s</span>
        </div>
        <div className="w-full bg-ink/10 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              duration >= MIN_DURATION ? "bg-moss dark:bg-glow" : "bg-coral"
            }`}
            style={{ width: `${Math.min((duration / MIN_DURATION) * 100, 100)}%` }}
          />
        </div>
        {duration < MIN_DURATION && isRecording && (
          <p className="mt-1.5 text-xs text-coral font-medium">
            Keep recording! {MIN_DURATION - duration} more second{MIN_DURATION - duration !== 1 ? 's' : ''} needed for voice cloning.
          </p>
        )}
        {duration >= MIN_DURATION && isRecording && (
          <p className="mt-1.5 text-xs text-moss dark:text-glow font-medium">
            Minimum duration met! You can stop recording or continue for a higher quality clone.
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || isInitializing}
          className={`inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 font-bold text-white transition ${
            isRecording
              ? "bg-coral hover:bg-coral/90"
              : "bg-moss hover:bg-moss/90"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {isInitializing ? (
            <Loader2 className="animate-spin" size={18} />
          ) : isRecording ? (
            <Square size={18} aria-hidden="true" />
          ) : (
            <Mic size={18} aria-hidden="true" />
          )}
          {isInitializing ? "Initializing..." : isRecording ? "Stop recording" : "Start recording"}
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
          {barHeights.map((height, index) => (
            <span
              key={index}
              className={`block w-2 rounded-full transition-all duration-75 ${
                isRecording ? "bg-coral" : "bg-black/20 dark:bg-neutral-700"
              }`}
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
      
      {audioUrl && duration < 10 && (
        <div className="mt-4 rounded-md border border-amber-400/40 bg-amber-50 p-3 text-sm font-semibold text-ink flex items-center gap-2 dark:bg-amber-900/20 dark:text-amber-300">
          <CircleAlert size={18} aria-hidden="true" className="text-amber-500" />
          <span>Recording is too short. Please record at least 10 seconds for best results.</span>
        </div>
        )}

      {audioUrl && duration < MIN_DURATION && (
        <div className="mt-4 rounded-md border border-coral/40 bg-coral/10 p-3 text-sm font-semibold text-ink flex items-center gap-2">
          <CircleAlert size={18} aria-hidden="true" className="text-coral" />
          <span>Warning: Your recording is only {duration}s. A minimum of {MIN_DURATION}s is required for voice cloning. Please record a longer reference.</span>
        </div>
      )}

      {recorderError && (
        <div role="alert" aria-live="polite" className="mt-4 rounded-md border border-coral/40 bg-coral/10 p-3 text-sm font-semibold text-ink flex items-center gap-2">
          <CircleAlert size={18} aria-hidden="true" className="text-coral shrink-0" />
          <span className="flex-1">{recorderError}</span>
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled || isInitializing}
            className="text-xs underline hover:no-underline shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
              setRecorderError("");
            }}
            aria-label="Dismiss error"
            className="text-xs font-bold shrink-0"
          >
            ✕
          </button>
        </div>
      )}
      <div className="mt-4 flex items-center gap-2 text-sm text-ink/60 dark:text-muted">
        <Upload size={16} aria-hidden="true" />
        Upload starts after you press "Clone voice".
      </div>
    </section>
  );
}
