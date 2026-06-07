import React, { useCallback, useEffect, useState } from "react";
import { Settings2, ChevronDown, ChevronUp } from "lucide-react";

const STORAGE_KEY = "voiceforge:voiceSettings";

const DEFAULT_SETTINGS = {
  stability: 0.45,
  similarity_boost: 0.8,
  style: 0.2,
};

/**
 * Reads voice settings from localStorage.
 * Falls back to defaults if the key is missing or JSON is malformed.
 */
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Persists voice settings to localStorage.
 */
function persistSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable — fail silently
  }
}

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
  const [settings, setSettings] = useState(loadSettings);

  // Keep in sync when the Settings page changes localStorage from another tab/component.
  useEffect(() => {
    function handleStorage(event) {
      if (event.key === STORAGE_KEY) {
        setSettings(loadSettings());
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
        persistSettings(next);
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
