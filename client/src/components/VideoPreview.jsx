// Draws the webcam and MVP lip-sync animation onto a canvas preview.
import React from "react";
import { Loader2 } from "lucide-react";
import { useTheme } from "./ThemeContext";

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
        
        // 1. Draw inner mouth cavity (dark reddish/maroon shade)
        context.fillStyle = isDark ? "rgba(69, 10, 10, 0.9)" : "rgba(59, 7, 18, 0.9)";
        context.beginPath();
        context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        context.fill();

        // 2. Draw lips shape outline and fill tint
        context.strokeStyle = "#f43f5e"; // rose/coral lip color
        context.fillStyle = "rgba(244, 63, 94, 0.15)"; // subtle soft coral tint
        context.lineWidth = 5 * scale;
        context.lineCap = "round";
        context.lineJoin = "round";

        // Cupid's bow upper lip curve
        context.beginPath();
        context.moveTo(centerX - radiusX, centerY);
        context.bezierCurveTo(
          centerX - radiusX / 2, centerY - radiusY - 8 * scale,
          centerX - radiusX / 4, centerY - radiusY - 10 * scale,
          centerX, centerY - radiusY / 2
        );
        context.bezierCurveTo(
          centerX + radiusX / 4, centerY - radiusY - 10 * scale,
          centerX + radiusX / 2, centerY - radiusY - 8 * scale,
          centerX + radiusX, centerY
        );
        // Lower lip bottom curve
        context.bezierCurveTo(
          centerX + radiusX / 2, centerY + radiusY + 12 * scale,
          centerX - radiusX / 2, centerY + radiusY + 12 * scale,
          centerX - radiusX, centerY
        );
        context.closePath();
        context.fill();
        context.stroke();

        // 3. Add a soft lip gloss highlight curve on the lower lip
        context.strokeStyle = "rgba(255, 255, 255, 0.4)";
        context.lineWidth = 2 * scale;
        context.beginPath();
        context.moveTo(centerX - radiusX / 2, centerY + radiusY + 4 * scale);
        context.bezierCurveTo(
          centerX - radiusX / 4, centerY + radiusY + 7 * scale,
          centerX + radiusX / 4, centerY + radiusY + 7 * scale,
          centerX + radiusX / 2, centerY + radiusY + 4 * scale
        );
        context.stroke();

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
          <Loader2
            className="animate-spin text-coral"
            size={20}
            aria-hidden="true"
          />
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
