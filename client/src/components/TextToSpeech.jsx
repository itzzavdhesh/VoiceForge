import React, { useCallback } from "react";
import { SendHorizontal } from "lucide-react";

export default function TextToSpeech({ onSpeak, disabled = false, status = "idle" }) {
  const MAX_TTS_CHARS = 300;
  
  const [text, setText] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const trimmedText = text.trim();
  const characterCount = text.length;
  const wordCount = trimmedText ? trimmedText.split(/\s+/).length : 0;
  const estimatedDuration = wordCount ? ((wordCount / 150) * 60).toFixed(1) : "0.0";
  let durationCategory = estimatedDuration > 30 ? "Long" : estimatedDuration > 15 ? "Medium" : "Short";

  const phrases = [
    { label: "SOS / Help", text: "Help me, please!", urgent: true },
    { label: "Danger Alert", text: "I am in danger!", urgent: true },
    { label: "Need Medical", text: "I need medical assistance.", urgent: true },
    { label: "Emergency", text: "This is an emergency.", urgent: true },
    { label: "Hello", text: "Hello!" }, { label: "Thank You", text: "Thank you." },
    { label: "Yes", text: "Yes." }, { label: "No", text: "No." },
    { label: "Please", text: "Please." }, { label: "Sorry", text: "I am sorry." },
    { label: "Bye", text: "Goodbye." }, { label: "More", text: "More, please." },
    { label: "Done", text: "I am done." }, { label: "Wait", text: "Please wait." }
  ];

  // Fix: Define the missing speakPhrase function
  const speakPhrase = useCallback(async (phraseText) => {
    if (disabled || status === "speaking" || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSpeak(phraseText);
    } finally {
      setIsSubmitting(false);
    }
  }, [onSpeak, disabled, status, isSubmitting]);
  
  async function submit() {
    if (!trimmedText || disabled || status === "speaking" || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSpeak(trimmedText);
      setText("");
    } finally {
      setIsSubmitting(false);
    }
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
        <p aria-live="polite" className="text-xs text-ink/60 dark:text-muted">
          Est. Duration: {estimatedDuration}s ({durationCategory})
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {phrases.map((p) => (
          <button
            key={p.label}
            type="button"
            disabled={disabled || status === "speaking" || isSubmitting}
            onClick={() => speakPhrase(p.text)}
            className={`px-3 py-2 text-sm font-semibold rounded-md transition ${p.urgent ? "bg-red-500 text-white animate-pulse" : "bg-moss/10 hover:bg-moss/20 dark:bg-white/5 dark:hover:bg-white/10"}`}>
            {p.label}
          </button>
        ))}
      </div>

      <textarea
        maxLength={MAX_TTS_CHARS}
        value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown} disabled={disabled}
        className="min-h-64 flex-1 resize-none rounded-md border border-ink/15 bg-cloud p-4 text-lg leading-8 text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-mint disabled:cursor-not-allowed disabled:opacity-60 dark:border-border dark:bg-black dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-glow dark:focus:ring-glow/25"
        placeholder="Type what you want to say..."
      />
      <p className="mt-2 text-sm text-ink/65 dark:text-muted" aria-live="polite">
        Characters: {characterCount}/{MAX_TTS_CHARS}
      </p>
      
      <button type="button" onClick={submit} disabled={disabled || !trimmedText || status === "speaking" || isSubmitting}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-coral px-5 py-3 font-bold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-50">
        <SendHorizontal size={18} aria-hidden="true" />
        {status === "speaking" ? "Generating..." : "Speak"}
      </button>
    </section>
  );
}
