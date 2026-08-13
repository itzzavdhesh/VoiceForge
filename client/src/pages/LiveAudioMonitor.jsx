import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  Play,
  Square,
  AlertTriangle,
  Activity,
} from "lucide-react";

export default function LiveAudioMonitor() {
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [warning, setWarning] = useState("");

  const intervalRef = useRef(null);

  useEffect(() => {
    if (recording) {
      intervalRef.current = setInterval(() => {
        // Demo microphone levels (replace with real mic input later)
        const current = Math.floor(Math.random() * 101);

        setLevel(current);

        setPeak((prev) => (current > prev ? current : prev));

        if (current > 90) {
          setWarning("⚠ Clipping detected! Lower microphone input.");
        } else if (current < 15) {
          setWarning("🔇 Silence detected.");
        } else {
          setWarning("✅ Recording level is good.");
        }
      }, 200);
    } else {
      clearInterval(intervalRef.current);
      setLevel(0);
      setPeak(0);
      setWarning("");
    }

    return () => clearInterval(intervalRef.current);
  }, [recording]);

  const startRecording = () => {
    setRecording(true);
  };

  const stopRecording = () => {
    setRecording(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
        <Mic className="text-blue-600" />
        Live Audio Level Monitor
      </h1>

      <p className="text-gray-500 mb-8">
        Monitor your microphone level before creating a voice clone.
      </p>

      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow border p-8">
        <div className="flex justify-center gap-4 mb-8">
          {!recording ? (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg"
            >
              <Play size={18} />
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-lg"
            >
              <Square size={18} />
              Stop Recording
            </button>
          )}
        </div>

        <div className="mb-8">
          <div className="flex justify-between mb-2 font-medium">
            <span>Live Audio Level</span>
            <span>{level}%</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                level > 90
                  ? "bg-red-500"
                  : level > 60
                  ? "bg-green-500"
                  : "bg-yellow-500"
              }`}
              style={{ width: `${level}%` }}
            />
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between font-medium mb-2">
            <span>Peak Level</span>
            <span>{peak}%</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-purple-600 h-full transition-all"
              style={{ width: `${peak}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-20 gap-1 h-28 items-end mb-8">
          {Array.from({ length: 20 }).map((_, i) => {
            const height = recording
              ? Math.max(15, Math.random() * level)
              : 10;

            return (
              <div
                key={i}
                className="bg-blue-500 rounded-t transition-all duration-200"
                style={{
                  height: `${height}px`,
                }}
              />
            );
          })}
        </div>

        <div
          className={`flex items-center gap-3 rounded-lg p-4 ${
            warning.includes("Clipping")
              ? "bg-red-100 text-red-700"
              : warning.includes("Silence")
              ? "bg-yellow-100 text-yellow-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {warning.includes("Clipping") ||
          warning.includes("Silence") ? (
            <AlertTriangle />
          ) : (
            <Activity />
          )}

          <span className="font-medium">
            {warning || "Press Start Recording"}
          </span>
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-5">
          <div className="rounded-lg border p-5">
            <h3 className="font-semibold mb-2">
              Live Meter
            </h3>
            <p className="text-sm text-gray-500">
              Shows current microphone volume in real time.
            </p>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-semibold mb-2">
              Peak Indicator
            </h3>
            <p className="text-sm text-gray-500">
              Tracks the highest input level during recording.
            </p>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-semibold mb-2">
              Quality Warning
            </h3>
            <p className="text-sm text-gray-500">
              Alerts for clipping and silence to improve recording quality.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}