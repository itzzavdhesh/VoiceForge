// Provides the large in-call typing surface and Speak command for generated speech.
import React from "react";
import { SendHorizontal, AlertTriangle, MessageSquare } from "lucide-react";

// Expanded 14-phrase Emergency & Quick-Phrase Dictionary for immediate, one-click articulation
const QUICK_PHRASES = [
  { phrase: "Help", label: "SOS / Help", isEmergency: true },
  { phrase: "I need medical attention", label: "Medical Emergency", isEmergency: true },
  { phrase: "Please call an ambulance", label: "Call Ambulance", isEmergency: true },
  { phrase: "Danger, get back", label: "Danger Alert", isEmergency: true },
  { phrase: "Thank you", label: "Thank You" },
  { phrase: "Please wait", label: "Please Wait" },
  { phrase: "Sorry", label: "Sorry" },
  { phrase: "Please", label: "Please" },
  { phrase: "Yes", label: "Yes" },
  { phrase: "No", label: "No" },
  { phrase: "Hello", label: "Hello" },
  { phrase: "Goodbye", label: "Goodbye" },
  { phrase: "More", label: "More" },
  { phrase: "Done", label: "Done" },
];

export default function TextToSpeech({ onSpeak, disabled = false, status = "idle" }) {
  const [text, setText] = React.useState("");
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

  async function submit() {
    if (!trimmedText || disabled) return;
    await onSpeak(trimmedText);
    setText("");
  }

  // Directly bypasses manual typing for instant, single-click audio execution
  async function handleQuickPhraseClick(phrase) {
    if (disabled || status === "speaking") return;
    await onSpeak(phrase);
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

          <p aria-live="polite" className="mt-2 text-xs text-ink/60 dark:text-muted">
            Est. Duration: {estimatedDuration}s ({durationCategory})
          </p>
        </div>
      </div>

      {/* --- QUICK PHRASE INSTANT GRID PANEL --- */}
      <div className="mb-4">
        <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-ink/50 dark:text-neutral-400">
          <MessageSquare size={12} /> Instant expressions & emergency panel
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUICK_PHRASES.map(({ phrase, label, isEmergency }) => (
            <button
              key={phrase}
              type="button"
              disabled={disabled || status === "speaking"}
              onClick={() => handleQuickPhraseClick(phrase)}
              className={[
                "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
                isEmergency
                  ? "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/60 dark:hover:bg-red-900/40"
                  : "bg-cloud text-ink hover:bg-ink/5 border border-ink/5 dark:bg-black dark:text-neutral-300 dark:border-border dark:hover:bg-neutral-900"
              ].join(" ")}
            >
              {isEmergency && <AlertTriangle size={12} className="animate-pulse text-red-500" />}
              {label}
            </button>
          ))}
        </div>
      </div>
      {/* -------------------------------------- */}

      <textarea
        aria-label="Type to speak"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || status === "speaking"}
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