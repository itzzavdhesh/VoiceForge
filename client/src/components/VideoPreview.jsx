// Draws the webcam and MVP lip-sync animation onto a canvas preview.
import React from "react";
import { useTheme } from "./ThemeContext";
import { useEffect, useRef } from "react";
import { AudioProcessor } from "../utils/audioProcessor";
import { FaceProcessor } from "../utils/faceProcessor";

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
  const audioProcessorRef = useRef(null);
  const faceProcessorRef = useRef(null);
  const ortSessionRef = useRef(null);
  const ortRef = useRef(null);
  const tempCanvasRef = useRef(null);
  const isInferringRef = useRef(false);
  const lastMouthCanvasRef = useRef(null);
  const lastMouthCoordsRef = useRef(null);
  const waveRef = useRef(null);

  if (!tempCanvasRef.current && typeof document !== "undefined") {
    tempCanvasRef.current = document.createElement("canvas");
    tempCanvasRef.current.width = 96;
    tempCanvasRef.current.height = 96;
  }

  if (!lastMouthCanvasRef.current && typeof document !== "undefined") {
    lastMouthCanvasRef.current = document.createElement("canvas");
    lastMouthCanvasRef.current.width = 96;
    lastMouthCanvasRef.current.height = 96;
  }

  useEffect(() => {
    if (!isSpeaking) {
      lastMouthCoordsRef.current = null;
    }
  }, [isSpeaking]);

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

  // Initialize AudioProcessor when audio element is ready
  useEffect(() => {
    if (audioUrl && audioRef.current && audioProcessorRef.current && !audioRef.current.dataset.audioProcessorInitialized) {
      audioProcessorRef.current.initialize(audioRef.current);
      audioRef.current.dataset.audioProcessorInitialized = "true";
    }
  }, [audioUrl]);

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
        ortRef.current = ort;
        ortSessionRef.current = await ort.InferenceSession.create(modelBytes);
        setModelStatus("ONNX Wav2Lip model loaded");
      } catch (err) {
        console.warn("Wav2Lip initialization skipped:", err.message);
        setModelStatus("Fallback mouth animation active");
        // TODO: Replace fallback canvas mouth animation with real browser Wav2Lip ONNX inference.
      }
    }
    loadModel();

    return () => {
      if (audioProcessorRef.current) {
        audioProcessorRef.current.dispose();
      }
      if (faceProcessorRef.current) {
        faceProcessorRef.current.dispose();
      }
      if (ortSessionRef.current) {
        ortSessionRef.current.release();
      }
    };
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
        let inferenceSucceeded = false;
        const useONNX = isSpeaking && ortSessionRef.current && audioProcessorRef.current && faceProcessorRef.current && ortRef.current;

        // Try ONNX Inference first
        if (useONNX) {
          inferenceSucceeded = true; // Prevent falling back to ellipse while model runs
          if (!isInferringRef.current) {
            isInferringRef.current = true;
            (async () => {
              try {
                const melFeatures = audioProcessorRef.current.getLatestFeatures();
                const landmarks = faceProcessorRef.current.detectFace(video, timestamp);
                if (melFeatures && landmarks) {
                  const detection = faceProcessorRef.current.cropMouthRegion(canvas, landmarks, tempCanvasRef.current);
                  if (detection) {
                    const ort = ortRef.current;
                    const audioTensor = new ort.Tensor('float32', melFeatures, [1, 1, 80, 16]);
                    
                    const floatData = new Float32Array(1 * 3 * 96 * 96);
                    const imgData = detection.imageData.data;
                    for (let i = 0; i < 96 * 96; i++) {
                      floatData[i] = imgData[i * 4] / 255.0;
                      floatData[96 * 96 + i] = imgData[i * 4 + 1] / 255.0;
                      floatData[2 * 96 * 96 + i] = imgData[i * 4 + 2] / 255.0;
                    }
                    const videoTensor = new ort.Tensor('float32', floatData, [1, 3, 96, 96]);

                    const results = await ortSessionRef.current.run({ audio: audioTensor, video: videoTensor });
                    const outputName = ortSessionRef.current.outputNames[0];
                    const outputTensor = results[outputName];
                    const outputData = outputTensor.data;

                    const tempCanvas = tempCanvasRef.current;
                    const tempCtx = tempCanvas.getContext('2d');
                    const outputImageData = tempCtx.createImageData(96, 96);
                    const outData = outputImageData.data;
                    for (let i = 0; i < 96 * 96; i++) {
                      const r = Math.min(255, Math.max(0, Math.round(outputData[i] * 255.0)));
                      const g = Math.min(255, Math.max(0, Math.round(outputData[96 * 96 + i] * 255.0)));
                      const b = Math.min(255, Math.max(0, Math.round(outputData[2 * 96 * 96 + i] * 255.0)));
                      outData[i * 4] = r;
                      outData[i * 4 + 1] = g;
                      outData[i * 4 + 2] = b;
                      outData[i * 4 + 3] = 255;
                    }
                    tempCtx.putImageData(outputImageData, 0, 0);

                    // Cache generated mouth and coordinates
                    const lastMouthCanvas = lastMouthCanvasRef.current;
                    const lastCtx = lastMouthCanvas.getContext('2d');
                    lastCtx.drawImage(tempCanvas, 0, 0);
                    lastMouthCoordsRef.current = detection.coords;
                  }
                }
              } catch (e) {
                console.error("Inference loop error:", e);
              } finally {
                isInferringRef.current = false;
              }
            })();
          }

          // Draw the cached mouth frame if available
          if (lastMouthCoordsRef.current) {
            const { x, y, w, h } = lastMouthCoordsRef.current;
            context.drawImage(lastMouthCanvasRef.current, x, y, w, h);
          } else {
            // If not yet cached, temporarily use ellipse
            inferenceSucceeded = false;
          }
        }

        if (!inferenceSucceeded) {
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
      }

      if (waveRef.current && audioProcessorRef.current) {
        const frequencies = audioProcessorRef.current.getFrequencyData();
        const spans = waveRef.current.querySelectorAll("span");
        spans.forEach((span, index) => {
          const freq = frequencies[index] || 0;
          const height = 4 + (freq / 255.0) * 16;
          span.style.height = `${height}px`;
        });
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
            ref={waveRef}
            className="recording-wave flex h-5 items-center gap-0.5"
            role="status"
            aria-label="Avatar speech active"
          >
            {[0, 0, 0, 0, 0].map((_, index) => (
              <span
                key={index}
                className="block w-[3px] bg-coral rounded-full"
                style={{ height: "4px" }}
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
          onPlay={() => {
            onSpeakingChange?.(true);
          }}
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
