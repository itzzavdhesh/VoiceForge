// Provides the large in-call typing surface and Speak command for generated speech.
import React from "react";
import { SendHorizontal, Loader2 } from "lucide-react";

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

  const isLoading = status === "speaking";

  async function submit() {
    if (!trimmedText || disabled || isLoading) return;
    await onSpeak(trimmedText);
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
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isLoading}
        className="min-h-64 flex-1 resize-none rounded-md border border-ink/15 bg-cloud p-4 text-lg leading-8 text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-mint disabled:cursor-not-allowed disabled:opacity-60 dark:border-border dark:bg-black dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-glow dark:focus:ring-glow/25"
        placeholder="Type what you want to say..."
      />

      {isLoading && (
        <p
          aria-live="polite"
          className="mt-3 flex items-center gap-2 text-sm font-semibold text-moss dark:text-glow"
        >
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Generating speech...
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={disabled || !trimmedText || isLoading}
        aria-busy={isLoading}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-coral px-5 py-3 font-bold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <SendHorizontal size={18} aria-hidden="true" />
        )}
        {isLoading ? "Generating..." : "Speak"}
      </button>
    </section>
  );
}