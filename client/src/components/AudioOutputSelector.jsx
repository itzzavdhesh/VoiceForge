import React, { useEffect, useState } from "react";
import { Volume2, Headphones, AlertCircle } from "lucide-react";
import {
  getAudioOutputDevices,
  getSelectedAudioOutput,
  setSelectedAudioOutput,
} from "../utils/audioOutput.js";

export function AudioOutputSelector({ id = "vf-audio-output", className = "" }) {
  const [devices, setDevices] = useState([]);
  const [selectedId, setSelectedId] = useState(getSelectedAudioOutput());
  const isSupported = typeof window !== "undefined" && typeof HTMLAudioElement !== "undefined" && "setSinkId" in HTMLAudioElement.prototype;

  useEffect(() => {
    let isMounted = true;

    async function loadDevices() {
      const list = await getAudioOutputDevices();
      if (isMounted) {
        setDevices(list);
      }
    }

    loadDevices();

    const handleDeviceChange = () => loadDevices();
    const handleOutputChange = (e) => setSelectedId(e.detail || getSelectedAudioOutput());

    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    }
    window.addEventListener("voiceforge:audioOutputChanged", handleOutputChange);

    return () => {
      isMounted = false;
      if (navigator.mediaDevices?.removeEventListener) {
        navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
      }
      window.removeEventListener("voiceforge:audioOutputChanged", handleOutputChange);
    };
  }, []);

  function handleChange(event) {
    const nextId = event.target.value;
    setSelectedId(nextId);
    setSelectedAudioOutput(nextId);
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-bold text-ink dark:text-neutral-200">
          <Headphones size={16} className="text-moss dark:text-glow" aria-hidden="true" />
          <span>Audio Output Device</span>
        </label>
        {!isSupported && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <AlertCircle size={12} aria-hidden="true" />
            <span>Default System Output</span>
          </span>
        )}
      </div>

      <div className="relative flex items-center">
        <Volume2 size={16} className="pointer-events-none absolute left-3 text-ink/40 dark:text-neutral-400" aria-hidden="true" />
        <select
          id={id}
          value={selectedId}
          onChange={handleChange}
          aria-label="Select audio output device"
          className="w-full rounded-md border border-ink/15 bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-moss focus:ring-2 focus:ring-mint dark:border-border dark:bg-black dark:text-neutral-100"
        >
          <option value="">Default System Speaker</option>
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-ink/50 dark:text-neutral-400">
        Route synthesized speech output directly to headphones or virtual audio cables for live video calls.
      </p>
    </div>
  );
}
