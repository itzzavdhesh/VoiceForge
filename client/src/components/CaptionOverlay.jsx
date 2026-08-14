// Settings panel for live caption overlay configuration
import React from "react";
import { Type, ToggleLeft, ToggleRight } from "lucide-react";

export default function CaptionOverlay({
  isEnabled,
  position,
  fontSize,
  onToggle,
  onPositionChange,
  onFontSizeChange,
}) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Type size={16} className="text-moss dark:text-glow" />
          <h3 className="font-semibold text-sm">Live Captions</h3>
        </div>
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 text-sm font-medium transition"
          aria-label="Toggle live captions"
        >
          {isEnabled ? (
            <>
              <ToggleRight size={22} className="text-moss dark:text-glow" />
              <span className="text-moss dark:text-glow text-xs">On</span>
            </>
          ) : (
            <>
              <ToggleLeft size={22} className="text-ink/40 dark:text-muted" />
              <span className="text-ink/40 dark:text-muted text-xs">Off</span>
            </>
          )}
        </button>
      </div>

      {isEnabled && (
        <div className="space-y-3">
          {/* Position */}
          <div>
            <p className="text-xs text-ink/60 dark:text-muted mb-1.5 font-medium uppercase tracking-wide">Position</p>
            <div className="flex gap-2">
              {["top", "middle", "bottom"].map((pos) => (
                <button
                  key={pos}
                  onClick={() => onPositionChange(pos)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold capitalize transition border ${
                    position === pos
                      ? "bg-moss text-white border-moss dark:bg-glow dark:border-glow dark:text-black"
                      : "border-ink/10 text-ink/60 hover:border-moss dark:border-border dark:text-muted dark:hover:border-glow"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <p className="text-xs text-ink/60 dark:text-muted mb-1.5 font-medium uppercase tracking-wide">Font Size</p>
            <div className="flex gap-2">
              {["small", "medium", "large"].map((size) => (
                <button
                  key={size}
                  onClick={() => onFontSizeChange(size)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold capitalize transition border ${
                    fontSize === size
                      ? "bg-moss text-white border-moss dark:bg-glow dark:border-glow dark:text-black"
                      : "border-ink/10 text-ink/60 hover:border-moss dark:border-border dark:text-muted dark:hover:border-glow"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-ink/50 dark:text-muted italic">
            Captions appear on the video canvas as you type.
          </p>
        </div>
      )}
    </div>
  );
}