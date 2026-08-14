// Draws the webcam and MVP lip-sync animation onto a canvas preview.
import React from "react";
import { useTheme } from "./ThemeContext";
import { useEffect, useRef } from "react";
import { AudioProcessor } from "../utils/audioProcessor";
import { FaceProcessor } from "../utils/faceProcessor";

export default React.forwardRef(function VideoPreview(
  { webcamStream, audioUrl, isSpeaking },
  ref,
) {
  const videoRef = React.useRef(null);
  const animationRef = React.useRef(null);
  const [modelStatus, setModelStatus] = React.useState(
    "Fallback animation ready",
  );

  React.useEffect(() => {
    async function loadModel() {
      try {
        const modelResponse = await fetch("/models/wav2lip.onnx");
        const modelBytes = new Uint8Array(await modelResponse.arrayBuffer());
        if (!modelResponse.ok || modelBytes[0] === 35) {
          throw new Error("Placeholder Wav2Lip model detected.");
        }

        // Initialize processors
        audioProcessorRef.current = new AudioProcessor();
        faceProcessorRef.current = new FaceProcessor();
        await faceProcessorRef.current.initialize();

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
    const bgColor = isDark ? "#0f172a" : "#dfe8df";
    const textColor = isDark ? "#e2e8f0" : "#16201d";
    const mouthColor = isDark
      ? "rgba(226, 232, 240, 0.82)"
      : "rgba(22, 32, 29, 0.82)";

    let isUnmounted = false;
    let fallbackTimer;
    let lastSyncTime = 0;
    let audioTimeOffset = null;

    function drawSubtitles(ctx, text, fontSettings, bgOpacity) {
      if (!text) return;

      const canvasWidth = ctx.canvas.width;
      const canvasHeight = ctx.canvas.height;

      let fontSize = 24;
      if (fontSettings === "small") fontSize = 18;
      if (fontSettings === "large") fontSize = 32;

      ctx.save();
      ctx.font = `600 ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const maxTextWidth = canvasWidth * 0.8;
      const words = text.split(" ");
      const lines = [];
      let currentLine = "";

      for (let n = 0; n < words.length; n++) {
        const testLine = currentLine + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxTextWidth && n > 0) {
          lines.push(currentLine.trim());
          currentLine = words[n] + " ";
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine.trim());

      const lineHeight = fontSize * 1.35;
      const totalHeight = lines.length * lineHeight;
      const paddingX = 24;
      const paddingY = 14;

      const boxWidth = Math.min(canvasWidth * 0.9, maxTextWidth + paddingX * 2);
      const boxHeight = totalHeight + paddingY * 2;

      const boxX = (canvasWidth - boxWidth) / 2;
      const boxY = canvasHeight * 0.82 - boxHeight / 2;

      if (bgOpacity > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${bgOpacity})`;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
        } else {
          ctx.rect(boxX, boxY, boxWidth, boxHeight);
        }
        ctx.fill();
      }

      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 4;

      lines.forEach((line, index) => {
        const lineY = boxY + paddingY + (index + 0.5) * lineHeight;
        ctx.fillText(line, canvasWidth / 2, lineY);
      });

      ctx.restore();
    }

    function draw(now, metadata) {
      if (isUnmounted) return;
      const timestamp = metadata ? metadata.mediaTime * 1000 : now;
      context.fillStyle = bgColor;
      context.fillRect(0, 0, canvas.width, canvas.height);

      const video = videoRef.current;
      if (video?.readyState >= 2) {
        if (blurEnabled && segmenterRef.current) {
          if (!isSegmentingRef.current) {
            isSegmentingRef.current = true;
            segmenterRef.current.send({ image: video }).catch((err) => {
              console.error(err);
              isSegmentingRef.current = false;
            });
          }
          if (maskCanvasRef.current) {
            context.drawImage(
              maskCanvasRef.current,
              0,
              0,
              canvas.width,
              canvas.height,
            );
          } else {
            // Draw video normally if first frame is not ready
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
        } else {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
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
        let amplitude = 0;
        if (analyserRef.current && isSpeaking) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          amplitude = sum / dataArray.length;
        }

        // Map amplitude (0-255) to mouth height range
        const mouthOpen = isSpeaking ? 6 + (amplitude * 0.12) : 14;
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

        // Try ONNX Inference first
        if (
          isSpeaking &&
          ortSessionRef.current &&
          audioProcessorRef.current &&
          faceProcessorRef.current
        ) {
          try {
            // 1. Get Audio Features
            const melFeatures = audioProcessorRef.current.getLatestFeatures();

        context.save();
        
        // 1. Draw inner mouth cavity (dark reddish/maroon shade)
        context.fillStyle = isDark ? "rgba(69, 10, 10, 0.9)" : "rgba(59, 7, 18, 0.9)";
        context.beginPath();
        context.ellipse(
          canvas.width / 2,
          canvas.height * 0.63,
          56,
          mouthOpen,
          0,
          0,
          Math.PI * 2,
        );
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
  }, [ref, isSpeaking, theme, captionText, captionEnabled, captionPosition, captionFontSize]);

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
        <audio className="mt-4 w-full" controls src={audioUrl} autoPlay>
          <track kind="captions" />
        </audio>
      )}
    </section>
  );
});
