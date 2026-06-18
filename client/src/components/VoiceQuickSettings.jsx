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
function SliderRow({ id, label, description, value, onChange }) {
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
        min="0"
        max="1"
        step="0.01"
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

  // Keep in sync when the Settings page changes localStorage from another tab/component.
  useEffect(() => {
    function handleStorage(event) {
      if (event.key === VOICE_SETTINGS_KEY) {
        setSettings(loadVoiceSettings());
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const updateSetting = useCallback(
    (key) => (event) => {
      const val = parseFloat(event.target.value);
      setSettings((prev) => {
        const next = { ...prev, [key]: val };
        persistVoiceSettings(next);
        return next;
      });
    },
    []
  );

  const toggleSpeakerBoost = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, use_speaker_boost: !prev.use_speaker_boost };
      persistVoiceSettings(next);
      return next;
    });
  }, []);

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
            id="vqs-similarity"
            label="Similarity Boost"
            description="Higher → closer to original voice. May add artifacts at max."
            value={settings.similarity_boost}
            onChange={updateSetting("similarity_boost")}
          />
          <SliderRow
            id="vqs-style"
            label="Style Exaggeration"
            description="Higher → more stylised delivery from the reference audio."
            value={settings.style}
            onChange={updateSetting("style")}
          />

          {/* ── Speaker Boost toggle ── */}
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-border">
            <div>
              <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Speaker Boost
              </p>
              <p
                id="vqs-speaker-boost-desc"
                className="mt-0.5 text-[10px] leading-snug text-neutral-400 dark:text-neutral-500"
              >
                Boosts similarity to the reference speaker. Disable if you hear metallic artifacts.
              </p>
            </div>
            <button
              id="vqs-speaker-boost"
              type="button"
              role="switch"
              aria-checked={settings.use_speaker_boost}
              aria-describedby="vqs-speaker-boost-desc"
              onClick={toggleSpeakerBoost}
              className={[
                "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent",
                "transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1 dark:focus:ring-offset-black",
                settings.use_speaker_boost
                  ? "bg-blue-500 dark:bg-blue-600"
                  : "bg-neutral-200 dark:bg-neutral-700",
              ].join(" ")}
              aria-label="Toggle Speaker Boost"
            >
              <span
                className={[
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200",
                  settings.use_speaker_boost ? "translate-x-4" : "translate-x-0",
                ].join(" ")}
              />
            </button>
          </div>

          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
            Changes apply to ElevenLabs voice synthesis.{" "}
            <span className="font-medium text-neutral-500 dark:text-neutral-400">
              Full controls in Settings →
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
