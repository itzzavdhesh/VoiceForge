// Presents the Go Live control and explains the current virtual camera stream state.
import { Radio, RadioTower, Square } from "lucide-react";

export default function VirtualCamera({ isLive, status, onStart, onStop }) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`rounded-md p-2 ${isLive ? "bg-coral text-white" : "bg-mint text-ink dark:bg-glow/15 dark:text-glow"}`}
          >
            {isLive ? (
              <RadioTower size={18} aria-hidden="true" />
            ) : (
              <Radio size={18} aria-hidden="true" />
            )}
          </span>
          <div>
            <h2 className="text-base font-bold">Virtual camera</h2>
            <p className="text-sm text-ink/65 dark:text-muted" aria-live="polite">{status}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={isLive ? onStop : onStart}
          aria-label={isLive ? "Stop virtual camera broadcast" : "Start virtual camera broadcast"}
          className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 font-bold text-white transition ${
            isLive
              ? "bg-black hover:bg-black/90 dark:bg-surface dark:hover:bg-neutral-900"
              : "bg-moss hover:bg-moss/90 dark:bg-glow dark:text-black dark:hover:bg-glow/90"
          }`}
        >
          {isLive ? (
            <Square size={16} aria-hidden="true" />
          ) : (
            <RadioTower size={16} aria-hidden="true" />
          )}
          {isLive ? "Stop" : "Go Live"}
        </button>
      </div>
    </section>
  );
}
