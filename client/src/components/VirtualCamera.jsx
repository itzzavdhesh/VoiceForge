// Presents the Go Live control and explains the current virtual camera stream state.
import { Radio, RadioTower, Square } from "lucide-react";

export default function VirtualCamera({ isLive, status, onStart, onStop }) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`rounded-md p-2 ${isLive ? "bg-coral text-white" : "bg-mint text-ink"}`}>
            {isLive ? <RadioTower size={18} aria-hidden="true" /> : <Radio size={18} aria-hidden="true" />}
          </span>
          <div>
            <h2 className="text-base font-bold">Virtual camera</h2>
            <p className="text-sm text-ink/65">{status}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={isLive ? onStop : onStart}
          className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 font-bold text-white transition ${
            isLive ? "bg-ink hover:bg-ink/90" : "bg-moss hover:bg-moss/90"
          }`}
        >
          {isLive ? <Square size={16} aria-hidden="true" /> : <RadioTower size={16} aria-hidden="true" />}
          {isLive ? "Stop" : "Go Live"}
        </button>
      </div>
    </section>
  );
}
