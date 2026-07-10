// client/src/components/AudioTrimmer.jsx
import React, { useState, useEffect, useRef } from "react";
import { Play, Square, Scissors, RotateCcw } from "lucide-react";
import { encodeWAV } from "../utils/wavEncoder.js";

export function AudioTrimmer({ audioBlob, onTrimComplete }) {
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [duration, setDuration] = useState(0);
  const [peaks, setPeaks] = useState([]);
  
  const [startRatio, setStartRatio] = useState(0.0);
  const [endRatio, setEndRatio] = useState(1.0);
  const [dragging, setDragging] = useState(null); // 'start' | 'end' | null
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); // ratio relative to duration
  
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const activeSourceRef = useRef(null);
  const startTimeRef = useRef(0);
  const playbackIntervalRef = useRef(null);

  // Decode audio data when the blob changes
  useEffect(() => {
    if (!audioBlob) {
      setAudioBuffer(null);
      setDuration(0);
      setPeaks([]);
      return;
    }

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = audioCtx;

    let active = true;

    async function decode() {
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const buffer = await audioCtx.decodeAudioData(arrayBuffer);
        if (active) {
          setAudioBuffer(buffer);
          setDuration(buffer.duration);
          
          // Extract peaks for drawing the waveform
          const channelData = buffer.getChannelData(0);
          const barCount = 150;
          const step = Math.floor(channelData.length / barCount) || 1;
          const tempPeaks = [];
          
          for (let i = 0; i < barCount; i++) {
            let max = 0;
            const start = i * step;
            const end = Math.min(channelData.length, (i + 1) * step);
            for (let j = start; j < end; j++) {
              const val = Math.abs(channelData[j]);
              if (val > max) max = val;
            }
            tempPeaks.push(max);
          }
          setPeaks(tempPeaks);
          // Reset trimmer handles
          setStartRatio(0.0);
          setEndRatio(1.0);
        }
      } catch (err) {
        console.error("Failed to decode reference audio:", err);
      }
    }

    decode();

    return () => {
      active = false;
      stopPreview();
      if (audioCtx.state !== "closed") {
        audioCtx.close();
      }
    };
  }, [audioBlob]);

  // Redraw canvas on value changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (peaks.length === 0) return;

    // Draw background grid lines
    ctx.strokeStyle = "rgba(0, 0, 0, 0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Positions of handles
    const startX = startRatio * w;
    const endX = endRatio * w;

    // 1. Draw Waveform bars
    peaks.forEach((peak, i) => {
      const barX = (i / peaks.length) * w;
      const barW = (w / peaks.length) * 0.7; // 70% width
      const barH = peak * h * 0.85; // Scale height
      const centerY = h / 2;

      // Color based on selection bounds
      if (barX >= startX && barX <= endX) {
        ctx.fillStyle = "#FF7262"; // Coral (active selection)
      } else {
        ctx.fillStyle = "rgba(0, 0, 0, 0.15)"; // Neutral gray (cropped out)
      }

      // Draw rounded rectangle bar
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(barX, centerY - barH / 2, barW, barH, 2);
      } else {
        ctx.rect(barX, centerY - barH / 2, barW, barH);
      }
      ctx.fill();
    });

    // 2. Draw Dimmed Mask for cropped areas
    ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
    ctx.fillRect(0, 0, startX, h);
    ctx.fillRect(endX, 0, w - endX, h);

    // 3. Draw playback progress cursor if playing
    if (isPlaying) {
      const progressX = playbackProgress * w;
      ctx.strokeStyle = "#40916C"; // Forest green playback bar
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, h);
      ctx.stroke();
      
      // Cursor head
      ctx.fillStyle = "#40916C";
      ctx.beginPath();
      ctx.arc(progressX, 4, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Draw Trim handles
    // Start handle (Greenish)
    ctx.strokeStyle = "#2EC4B6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, h);
    ctx.stroke();
    // Start handle tag
    ctx.fillStyle = "#2EC4B6";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(startX - 6, h / 2 - 12, 12, 24, 4) : ctx.rect(startX - 6, h / 2 - 12, 12, 24);
    ctx.fill();
    // Inner handle lines
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(startX - 2, h / 2 - 6, 1, 12);
    ctx.fillRect(startX + 1, h / 2 - 6, 1, 12);

    // End handle (Coral/Red)
    ctx.strokeStyle = "#FF6B6B";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, h);
    ctx.stroke();
    // End handle tag
    ctx.fillStyle = "#FF6B6B";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(endX - 6, h / 2 - 12, 12, 24, 4) : ctx.rect(endX - 6, h / 2 - 12, 12, 24);
    ctx.fill();
    // Inner handle lines
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(endX - 2, h / 2 - 6, 1, 12);
    ctx.fillRect(endX + 1, h / 2 - 6, 1, 12);

  }, [peaks, startRatio, endRatio, isPlaying, playbackProgress]);

  // Handle pointer down on handles
  function handleMouseDown(e) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const ratio = mouseX / rect.width;

    const startX = startRatio * rect.width;
    const endX = endRatio * rect.width;

    // Detect click hit area (within 16px of handles)
    if (Math.abs(mouseX - startX) < 16) {
      setDragging("start");
    } else if (Math.abs(mouseX - endX) < 16) {
      setDragging("end");
    }
  }

  // Handle pointer movements to adjust positions
  function handleMouseMove(e) {
    if (!dragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, mouseX / rect.width));

    if (dragging === "start") {
      // Ensure start doesn't exceed end (min 5% gap)
      setStartRatio(Math.min(ratio, endRatio - 0.05));
    } else if (dragging === "end") {
      // Ensure end doesn't exceed start (min 5% gap)
      setEndRatio(Math.max(ratio, startRatio + 0.05));
    }
  }

  function handleMouseUp() {
    setDragging(null);
  }

  // Play preview of the selected segment
  function startPreview() {
    if (!audioBuffer || !audioCtxRef.current) return;
    
    stopPreview();

    const ctx = audioCtxRef.current;
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const start = startRatio * duration;
    const length = (endRatio - startRatio) * duration;

    source.start(0, start, length);
    activeSourceRef.current = source;
    setIsPlaying(true);
    
    const startTime = ctx.currentTime;
    startTimeRef.current = startTime;
    setPlaybackProgress(startRatio);

    playbackIntervalRef.current = window.setInterval(() => {
      const elapsed = ctx.currentTime - startTime;
      const currentProgress = startRatio + (elapsed / duration);
      
      if (currentProgress >= endRatio) {
        stopPreview();
      } else {
        setPlaybackProgress(currentProgress);
      }
    }, 30);

    source.onended = () => {
      stopPreview();
    };
  }

  function stopPreview() {
    if (playbackIntervalRef.current) {
      window.clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
      } catch (e) {}
      activeSourceRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackProgress(0);
  }

  // Truncate and commit changes
  function handleApplyTrim() {
    if (!audioBuffer) return;
    
    const startSec = startRatio * duration;
    const endSec = endRatio * duration;
    const sliceLenSec = endSec - startSec;

    try {
      const trimmedBlob = encodeWAV(audioBuffer, startSec, endSec);
      onTrimComplete(trimmedBlob, sliceLenSec);
    } catch (e) {
      console.error("WAV trimming failed:", e);
    }
  }

  // Reset handles to bounds
  function handleReset() {
    setStartRatio(0.0);
    setEndRatio(1.0);
  }

  return (
    <div className="rounded-lg border border-neutral-100 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-black/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
          ✂️ Reference Audio Trimmer
        </h3>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-400 hover:text-coral"
        >
          <RotateCcw size={12} />
          Reset Selection
        </button>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={110}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="h-28 w-full cursor-ew-resize rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-inner"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={isPlaying ? stopPreview : startPreview}
            className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold text-white transition ${
              isPlaying ? "bg-neutral-600 hover:bg-neutral-700" : "bg-moss hover:bg-moss/90"
            }`}
          >
            {isPlaying ? (
              <>
                <Square size={12} fill="white" />
                Stop Preview
              </>
            ) : (
              <>
                <Play size={12} fill="white" />
                Play Selection
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleApplyTrim}
            className="inline-flex items-center gap-1.5 rounded-md bg-coral px-4.5 py-1.5 text-xs font-bold text-white hover:bg-coral/90 transition shadow-sm"
          >
            <Scissors size={12} />
            Apply Selection
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-neutral-500 dark:text-neutral-400">
          <div>
            Start: <span className="text-neutral-700 dark:text-neutral-300">{(startRatio * duration).toFixed(1)}s</span>
          </div>
          <div>
            End: <span className="text-neutral-700 dark:text-neutral-300">{(endRatio * duration).toFixed(1)}s</span>
          </div>
          <div className="rounded-full bg-coral/10 text-coral px-2.5 py-0.5 border border-coral/20">
            Selected: {((endRatio - startRatio) * duration).toFixed(1)}s
          </div>
        </div>
      </div>
    </div>
  );
}
