// Provides the large in-call typing surface and Speak command for generated speech.
import React from "react";
import { SendHorizontal } from "lucide-react";
import { loadVoiceSettings } from "../utils/voiceSettings.js";

/**
 * Emotion presets define prompt engineering text and voice_settings overrides
 * that are merged on top of the user's saved voice settings at speak-time.
 *
 * - promptPrefix: Injected before user text so ElevenLabs interprets tone.
 * - settingsOverride: Partial voice_settings merged over user defaults.
 *     • stability ↓  = more expressive / varied delivery
 *     • style ↑       = stronger stylistic emphasis
 */
const EMOTION_PRESETS = [
  {
    id: "neutral",
    label: "Neutral",
    emoji: "😐",
    description: "Default balanced tone",
    promptPrefix: "",
    settingsOverride: {},
  },
  {
    id: "excited",
    label: "Excited",
    emoji: "🤩",
    description: "High energy and enthusiastic",
    promptPrefix: "[Excited and enthusiastic tone] ",
    settingsOverride: { stability: 0.3, style: 0.7 },
  },
  {
    id: "serious",
    label: "Serious",
    emoji: "🧐",
    description: "Calm and authoritative",
    promptPrefix: "[Serious and authoritative tone] ",
    settingsOverride: { stability: 0.8, style: 0.15 },
  },
  {
    id: "questioning",
    label: "Questioning",
    emoji: "🤔",
    description: "Curious and inquisitive",
    promptPrefix: "[Questioning and curious tone] ",
    settingsOverride: { stability: 0.4, style: 0.5 },
  },
  {
    id: "whispering",
    label: "Whispering",
    emoji: "🤫",
    description: "Soft and intimate",
    promptPrefix: "[Soft whispering tone] ",
    settingsOverride: { stability: 0.6, style: 0.35 },
  },
  {
    id: "cheerful",
    label: "Cheerful",
    emoji: "😊",
    description: "Warm and friendly",
    promptPrefix: "[Cheerful and warm tone] ",
    settingsOverride: { stability: 0.35, style: 0.6 },
  },
];

export default function TextToSpeech({ onSpeak, disabled = false, status = "idle" }) {
  const [text, setText] = React.useState("");
  const [activeEmotion, setActiveEmotion] = React.useState("neutral");
  const trimmedText = text.trim();

const characterCount = trimmedText.length;

const wordCount = trimmedText
  ? trimmedText.split(/\s+/).length
  : 0;

const estimatedDuration = wordCount
  ? ((wordCount / 150) * 60).toFixed(1)
  : "0.0";

let durationCategory = "Short";

if (estimatedDuration > 15) {
  durationCategory = "Medium";
}

if (estimatedDuration > 30) {
  durationCategory = "Long";
}

  const activePreset = EMOTION_PRESETS.find((p) => p.id === activeEmotion) || EMOTION_PRESETS[0];

  async function submit() {
  if (!trimmedText || disabled) return;

  // Build the final text with the emotion prompt prefix
  const finalText = activePreset.promptPrefix
    ? `${activePreset.promptPrefix}${trimmedText}`
    : trimmedText;

  // Merge emotion overrides on top of the user's saved voice settings
  let voice_settings_override = undefined;
  if (Object.keys(activePreset.settingsOverride).length > 0) {
    const base = loadVoiceSettings();
    voice_settings_override = { ...base, ...activePreset.settingsOverride };
  }

  await onSpeak(finalText, voice_settings_override);
  setText("");
}

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <section className="flex h-full min-h-[420px] flex-col rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Type to speak</h2>
          <p className="mt-1 text-sm text-ink/65 dark:text-muted">Press Enter to speak. Shift + Enter adds a new line.</p>
        </div>
        <div className="text-right">
  <span className="rounded-md border border-ink/10 px-3 py-1 text-sm font-semibold text-ink/65 dark:border-border dark:text-muted">
    {characterCount}
  </span>

  <p
  aria-live="polite"
  className="mt-2 text-xs text-ink/60 dark:text-muted"
>
  Est. Duration: {estimatedDuration}s ({durationCategory})
</p>
</div>
      </div>

      {/* ── Emotion & Tone Presets ── */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-ink/50 dark:text-muted">
          Emotion &amp; Tone
        </p>
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Speech emotion preset"
        >
          {EMOTION_PRESETS.map((preset) => {
            const isActive = preset.id === activeEmotion;
            return (
              <button
                key={preset.id}
                id={`emotion-preset-${preset.id}`}
                type="button"
                role="radio"
                aria-checked={isActive}
                title={preset.description}
                onClick={() => setActiveEmotion(preset.id)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "border-moss bg-mint text-ink shadow-sm dark:border-glow dark:bg-glow/20 dark:text-glow"
                    : "border-ink/10 bg-cloud text-ink/70 hover:border-moss/40 hover:bg-mint/40 dark:border-border dark:bg-black dark:text-neutral-400 dark:hover:border-glow/40 dark:hover:bg-glow/10",
                ].join(" ")}
              >
                <span aria-hidden="true" className="text-base">{preset.emoji}</span>
                {preset.label}
              </button>
            );
          })}
        </div>
        {activeEmotion !== "neutral" && (
          <p className="mt-2 text-xs text-ink/50 dark:text-muted">
            <span className="font-semibold">{activePreset.emoji} {activePreset.label}:</span>{" "}
            {activePreset.description}
          </p>
        )}
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="min-h-64 flex-1 resize-none rounded-md border border-ink/15 bg-cloud p-4 text-lg leading-8 text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-mint disabled:cursor-not-allowed disabled:opacity-60 dark:border-border dark:bg-black dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-glow dark:focus:ring-glow/25"
        placeholder="Type what you want to say..."
      />
      
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !trimmedText || status === "speaking"}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-coral px-5 py-3 font-bold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SendHorizontal size={18} aria-hidden="true" />
        {status === "speaking" ? "Generating..." : "Speak"}
      </button>
    </section>
  );
}
