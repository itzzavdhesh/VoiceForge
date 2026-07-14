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
  isCalibrating = false,
  activeText = "",
  subtitlesEnabled = true,
  subtitleFontSize = "medium",
  subtitleBgOpacity = 0.6
}, ref) {
  const videoRef = React.useRef(null);
  const animationRef = React.useRef(null);
  const audioRef = useRef(null);   
  const audioProcessorRef = useRef(null);
  const faceProcessorRef = useRef(null);
  const ortSessionRef = useRef(null);
  const waveRef = useRef(null);
  const [modelStatus, setModelStatus] = React.useState(
    "Audio-driven animation ready",
  );
  const { theme } = useTheme();

  const calibrationRef = React.useRef(calibration);
  const isCalibratingRef = React.useRef(isCalibrating);

  const [blurEnabled, setBlurEnabled] = React.useState(false);
  const segmenterRef = React.useRef(null);
  const isSegmentingRef = React.useRef(false);
  const maskCanvasRef = React.useRef(null);

  const activeTextRef = React.useRef(activeText);
  const subtitlesEnabledRef = React.useRef(subtitlesEnabled);
  const subtitleFontSizeRef = React.useRef(subtitleFontSize);
  const subtitleBgOpacityRef = React.useRef(subtitleBgOpacity);

  React.useEffect(() => {
    activeTextRef.current = activeText;
  }, [activeText]);

  React.useEffect(() => {
    subtitlesEnabledRef.current = subtitlesEnabled;
  }, [subtitlesEnabled]);

  React.useEffect(() => {
    subtitleFontSizeRef.current = subtitleFontSize;
  }, [subtitleFontSize]);

  React.useEffect(() => {
    subtitleBgOpacityRef.current = subtitleBgOpacity;
  }, [subtitleBgOpacity]);

  React.useEffect(() => {
    function handleStorage(event) {
      if (
        (event.key === "voiceforge:voiceSettings" || event.type === "voiceforge:settingsChanged") &&
        audioProcessorRef.current
      ) {
        try {
          const saved = JSON.parse(localStorage.getItem("voiceforge:voiceSettings")) || {};
          const proc = audioProcessorRef.current;
          if (typeof saved.dspBass === "number") proc.setBass(saved.dspBass);
          if (typeof saved.dspMid === "number") proc.setMid(saved.dspMid);
          if (typeof saved.dspTreble === "number") proc.setTreble(saved.dspTreble);
          if (typeof saved.dspPitch === "number") proc.setPitch(saved.dspPitch);
          if (typeof saved.dspSpeed === "number" && audioRef.current) {
            proc.setSpeed(saved.dspSpeed, audioRef.current);
          }
        } catch (e) {
          console.error("Error syncing audio settings:", e);
        }
      }
    }
    window.addEventListener("storage", handleStorage);
    window.addEventListener("voiceforge:settingsChanged", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("voiceforge:settingsChanged", handleStorage);
    };
  }, []);

  React.useEffect(() => {
    async function initSegmenter() {
      try {
        const { SelfieSegmentation } = await import("@mediapipe/selfie_segmentation");
        const segmenter = new SelfieSegmentation({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
        });
        segmenter.setOptions({
          modelSelection: 1,
        });
        segmenter.onResults((results) => {
          if (!maskCanvasRef.current) {
            maskCanvasRef.current = document.createElement("canvas");
          }
          const mCanvas = maskCanvasRef.current;
          mCanvas.width = results.image.width;
          mCanvas.height = results.image.height;
          const mCtx = mCanvas.getContext("2d");
          
          mCtx.save();
          mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);
          
          mCtx.drawImage(results.segmentationMask, 0, 0, mCanvas.width, mCanvas.height);
          
          mCtx.globalCompositeOperation = "source-in";
          mCtx.drawImage(results.image, 0, 0, mCanvas.width, mCanvas.height);
          
          mCtx.globalCompositeOperation = "destination-over";
          mCtx.filter = "blur(12px)";
          mCtx.drawImage(results.image, 0, 0, mCanvas.width, mCanvas.height);
          
          mCtx.restore();
          
          isSegmentingRef.current = false;
        });
        
        // Pre-initialize
        await segmenter.initialize();
        segmenterRef.current = segmenter;
      } catch (err) {
        console.error("Failed to load MediaPipe segmenter", err);
      }
    }
    initSegmenter();
  }, []);

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
        ortSessionRef.current = await ort.InferenceSession.create(modelBytes);
        setModelStatus("ONNX Wav2Lip model loaded");
      } catch (err) {
        console.warn("Wav2Lip initialization skipped:", err.message);
        setModelStatus("Audio-driven animation active");
        audioProcessorRef.current = new AudioProcessor();
        // TODO: Replace audio-driven mouth animation with real browser Wav2Lip ONNX inference.
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

    function draw(timestamp) {
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
            context.drawImage(maskCanvasRef.current, 0, 0, canvas.width, canvas.height);
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
        let inferenceSucceeded = false;

        // Try ONNX Inference first
        if (isSpeaking && ortSessionRef.current && audioProcessorRef.current && faceProcessorRef.current) {
          try {
             // 1. Get Audio Features
             const melFeatures = audioProcessorRef.current.getLatestFeatures();
             
             // 2. Synchronize visual timestamp to the audio master clock to prevent drift
             let syncTimestamp = timestamp;
             const audioTime = audioProcessorRef.current.getAudioTime() * 1000;
             if (audioTime > 0) {
                if (audioTimeOffset === null) {
                   audioTimeOffset = timestamp - audioTime;
                }
                const targetSyncTime = audioTime + audioTimeOffset;
                // MediaPipe requires strictly increasing timestamps
                syncTimestamp = targetSyncTime <= lastSyncTime ? lastSyncTime + 1 : targetSyncTime;
                lastSyncTime = syncTimestamp;
             }

             // 3. Get Face Crop
             const landmarks = faceProcessorRef.current.detectFace(video, syncTimestamp);
             
             if (melFeatures && landmarks) {
               // TODO: Construct Tensors and run inference when real model is available
               // const audioTensor = new ort.Tensor('float32', melFeatures, [1, 1, 80, 16]);
               // const videoCrop = faceProcessorRef.current.cropMouthRegion(canvas, landmarks, tempCanvas);
               // const videoTensor = ... convert videoCrop to tensor ...
               // const results = await ortSessionRef.current.run({ audio: audioTensor, video: videoTensor });
               // ... draw results back to canvas ...
               
               // inferenceSucceeded = true;
             }
          } catch (e) {
             console.error("Inference loop error:", e);
          }
        }

        if (!inferenceSucceeded) {
          let mouthOpen = 14;
          if (isSpeaking && audioProcessorRef.current) {
            const vol = audioProcessorRef.current.getVolume();
            // Scale RMS volume (usually 0 to 0.3) to mouth height.
            // vol * 150 provides a responsive map to pixels, capped at 30 extra pixels.
            const extraOpen = Math.min(30, vol * 150);
            mouthOpen = 14 + extraOpen;
          }
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

          const centerX = Math.max(0, Math.min(canvas.width, canvas.width / 2 + xOffset));
          const centerY = Math.max(0, Math.min(canvas.height, canvas.height * 0.63 + yOffset));
          const radiusX = Math.max(0.01, 56 * scale);
          const radiusY = Math.max(0.01, mouthOpen * scale);

          context.save();
          context.fillStyle = mouthColor;
          context.beginPath();
          context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
          context.fill();
          context.restore();
        }
      }

      if (isSpeaking && subtitlesEnabledRef.current) {
        drawSubtitles(
          context,
          activeTextRef.current,
          subtitleFontSizeRef.current,
          subtitleBgOpacityRef.current
        );
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
          <h2 className="text-lg font-bold flex items-center gap-2">
            Lip-synced output
            <button
              onClick={() => setBlurEnabled(!blurEnabled)}
              className={`ml-2 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                blurEnabled 
                  ? "bg-coral text-white" 
                  : "bg-ink/10 text-ink/70 hover:bg-ink/20 dark:bg-border dark:text-muted dark:hover:bg-border/80"
              }`}
            >
              {blurEnabled ? "Blur ON" : "Blur OFF"}
            </button>
          </h2>
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
