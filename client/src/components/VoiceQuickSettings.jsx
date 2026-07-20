import React, { useCallback, useEffect, useState } from "react";
import { Settings2, ChevronDown, ChevronUp } from "lucide-react";
import {
  VOICE_SETTINGS_KEY,
  loadVoiceSettings,
  persistVoiceSettings,
} from "../utils/voiceSettings.js";

/**
 * A single labelled range slider row.
 */
function SliderRow({ id, label, description, value, onChange, min = 0, max = 1, step = 0.01 }) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300"
      >
        <span>{label}</span>
        <span
          className="tabular-nums text-neutral-500 dark:text-neutral-400"
          aria-live="polite"
          aria-label={`${label} value: ${value}`}
        >
          {value}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        aria-label={label}
        aria-describedby={`${id}-desc`}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-blue-500 dark:bg-neutral-700 dark:accent-blue-400"
      />
      <p
        id={`${id}-desc`}
        className="text-[11px] leading-snug text-neutral-400 dark:text-neutral-500"
      >
        {description}
      </p>
    </div>
  );
}

/**
 * VoiceQuickSettings — collapsible panel for inline voice parameter control.
 *
 * Reads from and writes to the same localStorage key ("voiceforge:voiceSettings")
 * used by the Settings page, so both views stay in sync automatically.
 *
 * @param {object}   props
 * @param {boolean}  props.defaultOpen — whether the panel starts expanded
 */
export function VoiceQuickSettings({ defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [settings, setSettings] = useState(loadVoiceSettings);

  // Keep in sync when settings change
  useEffect(() => {
    function handleStorage(event) {
      if (event.key === VOICE_SETTINGS_KEY || event.type === "voiceforge:settingsChanged") {
        setSettings(loadVoiceSettings());
      }
    }
    window.addEventListener("storage", handleStorage);
    window.addEventListener("voiceforge:settingsChanged", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("voiceforge:settingsChanged", handleStorage);
    };
  }, []);

  const updateSetting = useCallback(
    (key) => (event) => {
      const val = parseFloat(event.target.value);
      setSettings((prev) => {
        const next = { ...prev, [key]: val };
        persistVoiceSettings(next);
        window.dispatchEvent(new Event("voiceforge:settingsChanged"));
        return next;
      });
    },
    []
  );

  const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-border">
      {/* ── Toggle button ── */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-controls="vqs-panel"
        className="flex w-full items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:text-neutral-300 dark:hover:bg-surface dark:focus:ring-blue-500/40"
      >
        <Settings2 size={15} aria-hidden="true" />
        <span>Voice Quick Settings</span>
        <span className="ml-auto text-neutral-400 dark:text-neutral-500">
          {isOpen ? (
            <ChevronUp size={15} aria-hidden="true" />
          ) : (
            <ChevronDown size={15} aria-hidden="true" />
          )}
        </span>
      </button>

      {/* ── Collapsible slider panel ── */}
      {isOpen && (
        <div
          id="vqs-panel"
          role="group"
          aria-label="Voice quick settings"
          className="space-y-4 border-t border-neutral-200 px-4 py-4 dark:border-border"
        >
          <SliderRow
            id="vqs-stability"
            label="Stability"
            description="Lower → more expressive. Higher → more consistent."
            value={settings.stability}
            onChange={updateSetting("stability")}
          />
          <SliderRow
            id="vqs-temperature"
            label="Temperature"
            description="Lower → steadier output. Higher → more variation."
            value={settings.temperature}
            onChange={updateSetting("temperature")}
          />
          <SliderRow
            id="vqs-style"
            label="Style Exaggeration"
            description="Higher → more stylised delivery from the reference audio."
            value={settings.style}
            onChange={updateSetting("style")}
          />
          <SliderRow
            id="vqs-pitch"
            label="Voice Pitch"
            description="Adjust voice pitch."
            value={settings.dspPitch}
            onChange={updateSetting("dspPitch")}
            min={0.5}
            max={1.5}
            step={0.05}
          />
          <SliderRow
            id="vqs-speed"
            label="Speech Pace (Speed)"
            description="Adjust speech playback speed."
            value={settings.dspSpeed}
            onChange={updateSetting("dspSpeed")}
            min={0.5}
            max={2.0}
            step={0.05}
          />

          <details className="group border-t border-neutral-100 pt-3 dark:border-neutral-800">
            <summary className="flex cursor-pointer items-center justify-between text-xs font-bold text-neutral-600 dark:text-neutral-400 focus:outline-none">
              <span>Graphic Equalizer (EQ)</span>
              <span className="text-[10px] text-neutral-400 group-open:hidden">Show</span>
              <span className="text-[10px] text-neutral-400 hidden group-open:inline">Hide</span>
            </summary>
            <div className="space-y-4 mt-3 pl-1">
              <SliderRow
                id="vqs-bass"
                label="Bass (200 Hz)"
                description="Adjust low-end bass frequencies."
                value={settings.dspBass}
                onChange={updateSetting("dspBass")}
                min={-10}
                max={10}
                step={1}
              />
              <SliderRow
                id="vqs-mid"
                label="Mid (1000 Hz)"
                description="Adjust mid-range vocal presence."
                value={settings.dspMid}
                onChange={updateSetting("dspMid")}
                min={-10}
                max={10}
                step={1}
              />
              <SliderRow
                id="vqs-treble"
                label="Treble (4000 Hz)"
                description="Adjust high-frequency clarity."
                value={settings.dspTreble}
                onChange={updateSetting("dspTreble")}
                min={-10}
                max={10}
                step={1}
              />
            </div>
          </details>

          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
            Changes apply to Chatterbox voice synthesis.{" "}
            <span className="font-medium text-neutral-500 dark:text-neutral-400">
              Full controls in Settings →
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
