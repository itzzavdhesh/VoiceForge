// Draws the webcam and MVP lip-sync animation onto a canvas preview.
import React from "react";
import { useTheme } from "./ThemeContext";
import { useEffect, useRef } from "react";

export default React.forwardRef(function VideoPreview({
  webcamStream,
  audioUrl,
  isSpeaking,
  onSpeakingChange,
  calibration = { xOffset: 0, yOffset: 0, scale: 1.0 },
  isCalibrating = false
}, ref) {
  const videoRef = React.useRef(null);
  const animationRef = React.useRef(null);
  const audioRef = useRef(null);   
  const [modelStatus, setModelStatus] = React.useState(
    "Fallback animation ready",
  );
  const { theme } = useTheme();

  const calibrationRef = React.useRef(calibration);
  const isCalibratingRef = React.useRef(isCalibrating);

  const audioContextRef = React.useRef(null);
  const analyserRef = React.useRef(null);
  const sourceRef = React.useRef(null);
  const volumeRef = React.useRef(0);

  React.useEffect(() => {
    calibrationRef.current = calibration;
  }, [calibration]);

  React.useEffect(() => {
    isCalibratingRef.current = isCalibrating;
  }, [isCalibrating]);

  // Setup Web Audio API context and connect the audio element
  const setupAudioContext = React.useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (err) {
      console.error("Failed to initialize Web Audio API:", err);
    }
  }, []);

  // Handle HTML audio events
  const handlePlay = React.useCallback(() => {
    onSpeakingChange?.(true);
    setupAudioContext();
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch((err) => {
        console.warn("Failed to resume AudioContext on play:", err);
      });
    }
  }, [setupAudioContext, onSpeakingChange]);

  const handlePause = React.useCallback(() => {
    onSpeakingChange?.(false);
  }, [onSpeakingChange]);

  const handleEnded = React.useCallback(() => {
    onSpeakingChange?.(false);
  }, [onSpeakingChange]);

  const handleError = React.useCallback(() => {
    onSpeakingChange?.(false);
  }, [onSpeakingChange]);

  // Proactively resume context on user interactions (best practice for autoplay warning prevention)
  React.useEffect(() => {
    const resumeContext = () => {
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch((err) => {
          console.warn("Failed to resume AudioContext on interaction:", err);
        });
      }
    };

    window.addEventListener("click", resumeContext);
    window.addEventListener("keydown", resumeContext);
    return () => {
      window.removeEventListener("click", resumeContext);
      window.removeEventListener("keydown", resumeContext);
    };
  }, []);

  // Clean up AudioContext and nodes on unmount to prevent leaks
  React.useEffect(() => {
    return () => {
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          console.warn("Error disconnecting audio source:", e);
        }
      }
      if (analyserRef.current) {
        try {
          analyserRef.current.disconnect();
        } catch (e) {
          console.warn("Error disconnecting analyser:", e);
        }
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {
          console.warn("Error closing AudioContext:", e);
        }
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      onSpeakingChange?.(false);
    };
  }, [onSpeakingChange]);

  React.useEffect(() => {
    async function loadModel() {
      try {
        const modelResponse = await fetch("/models/wav2lip.onnx");
        const modelBytes = new Uint8Array(await modelResponse.arrayBuffer());
        if (!modelResponse.ok || modelBytes[0] === 35) {
          throw new Error("Placeholder Wav2Lip model detected.");
        }
        const ort = await import("onnxruntime-web");
        await ort.InferenceSession.create(modelBytes);
        setModelStatus("ONNX Wav2Lip model loaded");
      } catch {
        setModelStatus("Fallback mouth animation active");
        // TODO: Replace fallback canvas mouth animation with real browser Wav2Lip ONNX inference.
      }
    }
    loadModel();
  }, []);

  React.useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
    }
  }, [webcamStream]);

  React.useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return undefined;

    // Derive canvas colors from the active theme
    const isDark = theme === "dark";
    const bgColor   = isDark ? "#0f172a" : "#dfe8df";
    const textColor = isDark ? "#e2e8f0" : "#16201d";
    const mouthColor = isDark ? "rgba(226, 232, 240, 0.82)" : "rgba(22, 32, 29, 0.82)";

    function draw() {
      context.fillStyle = bgColor;
      context.fillRect(0, 0, canvas.width, canvas.height);

      const video = videoRef.current;
      if (video?.readyState >= 2) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      } else {
        context.fillStyle = textColor;
        context.font = "600 24px Inter, sans-serif";
        context.textAlign = "center";
        context.fillText(
          "Waiting for webcam",
          canvas.width / 2,
          canvas.height / 2,
        );
      }

      const drawMouth = isSpeaking || isCalibratingRef.current;
      if (drawMouth) {
        // Calculate reactive volume
        let targetVolume = 0;
        if (analyserRef.current && isSpeaking) {
          const analyser = analyserRef.current;
          const bufferLength = analyser.fftSize;
          const dataArray = new Uint8Array(bufferLength);
          analyser.getByteTimeDomainData(dataArray);

          let sumSquares = 0;
          for (let i = 0; i < bufferLength; i++) {
            const normalized = (dataArray[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / bufferLength);
          // Amplifying RMS value of speech to make mouth movement visually distinct
          targetVolume = Math.min(1.0, rms * 6.0);
        }

        // Smooth volume using linear interpolation (lerp)
        volumeRef.current = volumeRef.current * 0.6 + targetVolume * 0.4;
        const currentVolume = volumeRef.current;

        // Map currentVolume to width and height
        // If not speaking (but calibrating), show a static calibration baseline mouth shape (currentVolume = 0.5 equivalent)
        const effectiveVolume = isSpeaking ? currentVolume : 0.5;

        const currentCalibration = calibrationRef.current || {};
        const xOffset = typeof currentCalibration.xOffset === "number" && !isNaN(currentCalibration.xOffset)
          ? Math.max(-400, Math.min(400, currentCalibration.xOffset))
          : 0;
        const yOffset = typeof currentCalibration.yOffset === "number" && !isNaN(currentCalibration.yOffset)
          ? Math.max(-250, Math.min(150, currentCalibration.yOffset))
          : 0;
        const scale = typeof currentCalibration.scale === "number" && !isNaN(currentCalibration.scale)
          ? Math.max(0.5, Math.min(2.5, currentCalibration.scale))
          : 1.0;

        const centerX = canvas.width / 2 + xOffset;
        const centerY = canvas.height * 0.63 + yOffset;

        const baseRadiusX = 44 + effectiveVolume * 12; // ranges from 44 to 56
        const baseRadiusY = 2 + effectiveVolume * 22;  // ranges from 2 to 24

        const radiusX = Math.max(0.01, baseRadiusX * scale);
        const radiusY = Math.max(0.01, baseRadiusY * scale);

        context.save();
        context.fillStyle = mouthColor;
        context.beginPath();
        context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }

      animationRef.current = requestAnimationFrame(draw);
    }

    animationRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationRef.current);
  }, [ref, isSpeaking, theme]);

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Lip-synced output</h2>
          <p className="mt-1 text-sm text-ink/65 dark:text-muted">
            {modelStatus}
          </p>
        </div>
        {isSpeaking && (
          <div
            className="recording-wave flex h-5 items-center gap-0.5"
            role="status"
            aria-label="Avatar speech active"
          >
            {[14, 20, 16, 18, 12].map((height, index) => (
              <span
                key={index}
                className="block w-[3px] bg-coral rounded-full"
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
        )}
      </div>
      <video ref={videoRef} autoPlay muted playsInline className="hidden" />
      <canvas
        ref={ref}
        width="960"
        height="540"
        className="aspect-video w-full rounded-md bg-black object-cover"
      />
      {audioUrl && (
        <audio
          ref={audioRef}
          key={audioUrl}
          className="mt-4 w-full"
          controls
          src={audioUrl}
          autoPlay
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={handleError}
        >
          <track kind="captions" />
        </audio>
      )}
    </section>
  );
});
