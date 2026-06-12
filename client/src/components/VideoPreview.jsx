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

  React.useEffect(() => {
    calibrationRef.current = calibration;
  }, [calibration]);

  React.useEffect(() => {
    isCalibratingRef.current = isCalibrating;
  }, [isCalibrating]);

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

    function draw(timestamp) {
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
        const mouthOpen = isSpeaking ? 14 + Math.sin(timestamp / 80) * 8 : 14;
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
        const radiusX = 56 * scale;
        const radiusY = mouthOpen * scale;

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
          onPlay={() => onSpeakingChange?.(true)}
          onPause={() => onSpeakingChange?.(false)}
          onEnded={() => onSpeakingChange?.(false)}
          onError={() => onSpeakingChange?.(false)}
        >
          <track kind="captions" />
        </audio>
      )}
    </section>
  );
});
