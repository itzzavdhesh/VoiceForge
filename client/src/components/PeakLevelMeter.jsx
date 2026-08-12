import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, AlertTriangle, Activity } from "lucide-react";

/**
 * PeakLevelMeter
 * Displays a real-time VU Peak Level Meter (-60 dB to 0 dB+) driven by Web Audio API.
 * Features an active clipping warning indicator when peak volume exceeds 0 dB (or 0.95 peak amplitude).
 */
export function PeakLevelMeter({
  audioElementRef,
  analyserNode,
  isActive = false,
  testLevel = null,
  showLabels = true,
  className = "",
}) {
  const [peakDb, setPeakDb] = useState(-60);
  const [isClipping, setIsClipping] = useState(false);
  const [maxPeakDb, setMaxPeakDb] = useState(-60);
  const animationFrameRef = useRef(null);
  const internalAnalyserRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    // If a direct numeric test level is provided, use it directly (useful for tests and static demos)
    if (testLevel !== null) {
      const level = Math.max(-60, Math.min(6, testLevel));
      setPeakDb(level);
      setIsClipping(level >= 0);
      setMaxPeakDb((prev) => Math.max(prev, level));
      return;
    }

    let analyser = analyserNode;

    // Connect to audioElementRef if provided and analyserNode is not directly passed
    if (!analyser && audioElementRef?.current) {
      try {
        const audioEl = audioElementRef.current;
        if (!audioEl._vfSource) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            audioCtxRef.current = ctx;
            const source = ctx.createMediaElementSource(audioEl);
            const node = ctx.createAnalyser();
            node.fftSize = 256;
            source.connect(node);
            node.connect(ctx.destination);
            audioEl._vfSource = source;
            audioEl._vfAnalyser = node;
          }
        }
        analyser = audioEl._vfAnalyser || null;
      } catch (err) {
        // Fallback for media element already connected or blocked cross-origin
        console.debug("PeakLevelMeter Web Audio connection fallback:", err);
      }
    }

    internalAnalyserRef.current = analyser;

    if (!isActive && !analyser) {
      setPeakDb(-60);
      setIsClipping(false);
      return;
    }

    const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : 128);

    const updateMeter = () => {
      let maxVal = 0;

      if (analyser) {
        analyser.getByteTimeDomainData(dataArray);
        for (let i = 0; i < dataArray.length; i++) {
          const sample = Math.abs((dataArray[i] - 128) / 128);
          if (sample > maxVal) maxVal = sample;
        }
      } else if (isActive) {
        // Simulated ambient meter activity when active without direct media stream
        maxVal = 0.2 + Math.random() * 0.45;
      }

      // Convert amplitude (0 to 1) to Decibels (-60 dB to +3 dB)
      let db = -60;
      if (maxVal > 0.0001) {
        db = 20 * Math.log10(maxVal);
      }
      db = Math.max(-60, Math.min(3, db));

      setPeakDb(db);
      const clippingDetected = db >= -0.5 || maxVal >= 0.95;
      setIsClipping(clippingDetected);
      setMaxPeakDb((prev) => Math.max(prev, db));

      animationFrameRef.current = requestAnimationFrame(updateMeter);
    };

    animationFrameRef.current = requestAnimationFrame(updateMeter);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioElementRef, analyserNode, isActive, testLevel]);

  // Map peakDb (-60dB to 0dB) to a percentage (0% to 100%)
  const percentage = Math.max(0, Math.min(100, ((peakDb + 60) / 60) * 100));

  function resetMaxPeak() {
    setMaxPeakDb(-60);
    setIsClipping(false);
  }

  return (
    <div className={`rounded-lg border border-ink/10 bg-white p-3.5 shadow-soft dark:border-border dark:bg-surface dark:shadow-soft-dk ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Activity size={16} className={isClipping ? "text-red-500 animate-pulse" : "text-moss dark:text-glow"} aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider text-ink dark:text-neutral-200">
            VU Peak Level Meter
          </span>
        </div>

        {/* Digital Clipping Warning Indicator Badge */}
        <div className="flex items-center gap-1.5">
          {isClipping ? (
            <div
              role="alert"
              aria-live="assertive"
              className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase text-white shadow animate-bounce"
            >
              <AlertTriangle size={12} aria-hidden="true" />
              <span>CLIP WARNING!</span>
            </div>
          ) : (
            <span className="text-[11px] font-mono text-ink/60 dark:text-neutral-400">
              {peakDb <= -60 ? "-∞ dB" : `${peakDb.toFixed(1)} dB`}
            </span>
          )}
        </div>
      </div>

      {/* Meter Bar Container */}
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-ink/10 dark:bg-black/40 p-0.5 border border-ink/5 dark:border-border">
        {/* Animated Fill Bar with Color Gradient (Green -> Yellow -> Red) */}
        <div
          className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500"
          style={{ width: `${percentage}%` }}
        />

        {/* Max Peak Hold Indicator Line */}
        {maxPeakDb > -60 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-ink dark:bg-white shadow"
            style={{ left: `${Math.max(0, Math.min(99, ((maxPeakDb + 60) / 60) * 100))}%` }}
            title={`Max Peak: ${maxPeakDb.toFixed(1)} dB`}
          />
        )}
      </div>

      {showLabels && (
        <div className="mt-1.5 flex justify-between text-[10px] font-mono text-ink/50 dark:text-neutral-400">
          <span>-60 dB</span>
          <span>-36 dB</span>
          <span>-18 dB</span>
          <span>-6 dB</span>
          <span className={isClipping ? "font-bold text-red-500" : ""}>0 dB</span>
        </div>
      )}
    </div>
  );
}
