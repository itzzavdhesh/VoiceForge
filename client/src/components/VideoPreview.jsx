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
  avatarImage = null,
  subtitlesEnabled = true,
  subtitleFontSize = "medium",
  subtitleBgOpacity = 0.6,
  activeText = "",
  status = "idle",
}, ref) {
  const videoRef = React.useRef(null);
  const animationRef = React.useRef(null);
  const audioRef = useRef(null);   
  const audioProcessorRef = useRef(null);
  const faceProcessorRef = useRef(null);
  const subtitlesEnabledRef = React.useRef(subtitlesEnabled);
  const subtitleTextRef = React.useRef(activeText);
  const subtitleFontSizeRef = React.useRef(subtitleFontSize);
  const subtitleBgOpacityRef = React.useRef(Number(subtitleBgOpacity));
  const ortSessionRef = useRef(null);
  const ortRef = useRef(null);
  const isInferencingRef = useRef(false);
  const tempCanvasRef = useRef(null);
  const lastInferenceRef = useRef(null);
  const waveRef = useRef(null);
  const [modelStatus, setModelStatus] = React.useState(
    "Fallback animation ready",
  );
  const { theme } = useTheme();

  const calibrationRef = React.useRef(calibration);
  const isCalibratingRef = React.useRef(isCalibrating);
  const activeTextRef = React.useRef(activeText);

  const pipVideoRef = React.useRef(null);
  const isPiPSupported = typeof document !== "undefined" && document.pictureInPictureEnabled;

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        if (!pipVideoRef.current.srcObject) {
          const stream = ref.current.captureStream(30);
          pipVideoRef.current.srcObject = stream;
          await pipVideoRef.current.play();
        }
        await pipVideoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error("PiP error:", error);
    }
  };
  const [blurEnabled, setBlurEnabled] = React.useState(false);
  const segmenterRef = React.useRef(null);
  const isSegmentingRef = React.useRef(false);
  const maskCanvasRef = React.useRef(null);

  React.useEffect(() => { subtitlesEnabledRef.current = subtitlesEnabled; }, [subtitlesEnabled]);
  React.useEffect(() => { subtitleFontSizeRef.current = subtitleFontSize; }, [subtitleFontSize]);
  React.useEffect(() => { subtitleBgOpacityRef.current = subtitleBgOpacity; }, [subtitleBgOpacity]);
  React.useEffect(() => { activeTextRef.current = activeText; }, [activeText]);

  React.useEffect(() => {
    let isSegmenterMounted = true;
    async function initSegmenter() {
      try {
        const { SelfieSegmentation } = await import("@mediapipe/selfie_segmentation");
        const segmenter = new SelfieSegmentation({
          locateFile: (file) => {
            if (typeof window !== "undefined" && window.location.origin) {
              return `${window.location.origin}/wasm/${file}`;
            }
            return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
          },
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
        if (isSegmenterMounted) {
          segmenterRef.current = segmenter;
        } else {
          segmenter.close();
        }
      } catch (err) {
        console.error("Failed to load MediaPipe segmenter", err);
      }
    }
    initSegmenter();

    return () => {
      isSegmenterMounted = false;
      if (segmenterRef.current) {
        try {
          segmenterRef.current.close();
        } catch {
          /* ignore closing errors */
        }
        segmenterRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (!tempCanvasRef.current && typeof document !== "undefined") {
      tempCanvasRef.current = document.createElement("canvas");
      tempCanvasRef.current.width = 96;
      tempCanvasRef.current.height = 96;
    }
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
    let isModelMounted = true;
    async function loadModel() {
      try {
        const modelResponse = await fetch("/models/wav2lip.onnx");
        const modelBytes = new Uint8Array(await modelResponse.arrayBuffer());
        if (!modelResponse.ok || modelBytes[0] === 35) {
          throw new Error("Placeholder Wav2Lip model detected.");
        }

        // Initialize processors
        const audioProc = new AudioProcessor();
        const faceProc = new FaceProcessor();
        await faceProc.initialize();

        const ort = await import("onnxruntime-web");
        const session = await ort.InferenceSession.create(modelBytes);

        if (!isModelMounted) {
          audioProc.dispose();
          faceProc.dispose();
          session.release();
          return;
        }

        audioProcessorRef.current = audioProc;
        faceProcessorRef.current = faceProc;
        ortSessionRef.current = session;
        setModelStatus("ONNX Wav2Lip model loaded");
      } catch (err) {
        if (isModelMounted) {
          console.warn("Wav2Lip initialization skipped:", err.message);
          setModelStatus("Audio-driven animation active");
        }
      }
    }
    loadModel();

    return () => {
      isModelMounted = false;
      if (audioProcessorRef.current) {
        audioProcessorRef.current.dispose();
        audioProcessorRef.current = null;
      }
      if (faceProcessorRef.current) {
        faceProcessorRef.current.dispose();
        faceProcessorRef.current = null;
      }
      if (ortSessionRef.current) {
        ortSessionRef.current.release();
        ortSessionRef.current = null;
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

    let lastFrameTime = 0;
    const fpsInterval = 1000 / 30; // 30 FPS cap

    function draw(now, metadata) {
      const timestamp = now || performance.now();
      const elapsed = timestamp - lastFrameTime;

      if (elapsed < fpsInterval) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = timestamp - (elapsed % fpsInterval);
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
        let inferenceSucceeded = false;
        const useONNX = isSpeaking && ortSessionRef.current && audioProcessorRef.current && faceProcessorRef.current && ortRef.current;

        // Try ONNX Inference first
        if (isSpeaking && ortSessionRef.current && audioProcessorRef.current && faceProcessorRef.current && ortRef.current) {
          if (!isInferencingRef.current) {
            isInferencingRef.current = true;
            (async () => {
              try {
                const melFeatures = audioProcessorRef.current.getLatestFeatures();
                let syncTimestamp = timestamp;
                const audioTime = audioProcessorRef.current.getAudioTime() * 1000;
                if (audioTime > 0) {
                  if (audioTimeOffset === null) {
                     audioTimeOffset = timestamp - audioTime;
                  }
                  const targetSyncTime = audioTime + audioTimeOffset;
                  syncTimestamp = targetSyncTime <= lastSyncTime ? lastSyncTime + 1 : targetSyncTime;
                  lastSyncTime = syncTimestamp;
                }

                const landmarks = faceProcessorRef.current.detectFace(video, syncTimestamp);
                
                if (melFeatures && landmarks && tempCanvasRef.current) {
                  const ort = ortRef.current;
                  const audioTensor = new ort.Tensor('float32', melFeatures, [1, 1, 80, 16]);
                  
                  const cropResult = faceProcessorRef.current.cropMouthRegion(canvas, landmarks, tempCanvasRef.current);
                  if (cropResult) {
                    const { imageData, coords } = cropResult;
                    const float32Data = new Float32Array(1 * 6 * 96 * 96);
                    for (let i = 0; i < 96 * 96; i++) {
                      const r = imageData.data[i * 4 + 0] / 255.0;
                      const g = imageData.data[i * 4 + 1] / 255.0;
                      const b = imageData.data[i * 4 + 2] / 255.0;
                      float32Data[i] = r;
                      float32Data[96 * 96 + i] = g;
                      float32Data[2 * 96 * 96 + i] = b;
                      float32Data[3 * 96 * 96 + i] = r;
                      float32Data[4 * 96 * 96 + i] = g;
                      float32Data[5 * 96 * 96 + i] = b;
                    }
                    const videoTensor = new ort.Tensor('float32', float32Data, [1, 6, 96, 96]);
                    
                    const results = await ortSessionRef.current.run({ audio: audioTensor, video: videoTensor });
                    const outTensor = results[Object.keys(results)[0]];
                    
                    const outData = outTensor.data;
                    const newImageData = new ImageData(96, 96);
                    for (let i = 0; i < 96 * 96; i++) {
                      newImageData.data[i * 4 + 0] = Math.max(0, Math.min(255, outData[i] * 255));
                      newImageData.data[i * 4 + 1] = Math.max(0, Math.min(255, outData[96 * 96 + i] * 255));
                      newImageData.data[i * 4 + 2] = Math.max(0, Math.min(255, outData[2 * 96 * 96 + i] * 255));
                      newImageData.data[i * 4 + 3] = 255;
                    }
                    
                    lastInferenceRef.current = {
                      imageData: newImageData,
                      coords: coords
                    };
                  }
                }
              } catch (e) {
                console.error("ONNX Inference Error", e);
              } finally {
                isInferencingRef.current = false;
              }
            })();
          }

          if (lastInferenceRef.current && tempCanvasRef.current) {
            const { imageData, coords } = lastInferenceRef.current;
            const tempCtx = tempCanvasRef.current.getContext("2d");
            tempCtx.putImageData(imageData, 0, 0);
            context.drawImage(tempCanvasRef.current, 0, 0, 96, 96, coords.x, coords.y, coords.w, coords.h);
            inferenceSucceeded = true;
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

      if (video && video.requestVideoFrameCallback && !avatarImage) {
        animationRef.current = video.requestVideoFrameCallback(draw);
      } else {
        animationRef.current = requestAnimationFrame(draw);
      }
    }

    const videoElement = videoRef.current;
    if (videoElement && videoElement.requestVideoFrameCallback && !avatarImage) {
      animationRef.current = videoElement.requestVideoFrameCallback(draw);
    } else {
      animationRef.current = requestAnimationFrame(draw);
    }

    return () => {
      const vid = videoRef.current;
      if (vid && vid.cancelVideoFrameCallback && !avatarImage) {
        vid.cancelVideoFrameCallback(animationRef.current);
      } else {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [ref, isSpeaking, theme, avatarImage]);

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
      <video ref={pipVideoRef} autoPlay muted playsInline className="hidden" />
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
        <canvas
          ref={ref}
          width="960"
          height="540"
          role="img"
          aria-label="Lip-synced video output preview"
          className="h-full w-full object-cover"
        />
        {status === "speaking" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-300">
            <div className="flex flex-col items-center space-y-4 rounded-xl bg-ink/90 px-8 py-6 text-white shadow-2xl backdrop-blur-md dark:bg-black/90">
              <div className="relative flex h-12 w-12 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-75"></span>
                <span className="relative inline-flex h-8 w-8 rounded-full bg-coral"></span>
              </div>
              <p className="animate-pulse text-sm font-bold tracking-widest text-neutral-100 uppercase">
                Generating Speech
              </p>
            </div>
          </div>
        )}
      </div>
      {audioUrl && (
        <audio className="mt-4 w-full" controls src={audioUrl} autoPlay>
          <track kind="captions" />
        </audio>
      )}
    </section>
  );
});
