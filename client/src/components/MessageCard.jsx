import React from "react";
import { Copy, Pin, Play, RotateCcw, Trash2 } from "lucide-react";

function formatTime(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function MessageCard({
  message,
  isPinned,
  onReuse,
  onReplay,
  onToggleFav,
  onDelete,
  onCopy,
  audioUrl,
  onDownload,
}) {
  const { id, text, timestamp, tags } = message;
  const timeLabel = useRelativeTime(timestamp);

  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagText, setNewTagText] = useState("");

  const handleAddTagSubmit = (e) => {
    e.preventDefault();
    const tag = newTagText.trim();
    if (!tag) return;
    if (tag.length > 15) return;
    onAddTag(id, tag);
    setNewTagText("");
    setIsAddingTag(false);
  };

  return (
    <article
      className={[
        "group relative rounded-md border bg-white p-3 text-sm shadow-none",
        "transition-all duration-150 hover:border-blue-400 dark:bg-surface",
        isPinned ? "border-l-4 border-l-amber-400 border-neutral-200 dark:border-border dark:border-l-amber-400" : "border-neutral-200 dark:border-border",
      ].join(" ")}
      aria-label={`Message: ${text}`}
    >
      <p className="mb-2 break-words leading-relaxed text-neutral-800 dark:text-neutral-100">
        {text}
      </p>

      <div className="flex items-center justify-between">
        <time
          dateTime={new Date(timestamp).toISOString()}
          className="text-xs text-neutral-400 dark:text-neutral-500"
        >
          {timeLabel}
        </time>

        <div
          className="flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          role="group"
          aria-label="Message actions"
        >
          <ActionButton onClick={() => onReplay(text)} aria-label="Replay this message" title="Replay">
            <Play size={14} aria-hidden="true" fill="currentColor" />
          </ActionButton>
          <ActionButton onClick={() => onReuse(text)} aria-label="Load this message into the composer" title="Reuse">
            <RotateCcw size={14} aria-hidden="true" />
          </ActionButton>
          <ActionButton onClick={() => onCopy(text)} aria-label="Copy message to clipboard" title="Copy">
            <Copy size={14} aria-hidden="true" />
          </ActionButton>
          <ActionButton
            onClick={() => onToggleFav(id)}
            aria-label={isPinned ? "Unpin message" : "Pin message"}
            aria-pressed={isPinned}
            title={isPinned ? "Unpin" : "Pin"}
            className={isPinned ? "text-amber-500" : ""}
          >
            <Pin size={14} aria-hidden="true" fill={isPinned ? "currentColor" : "none"} />
          </ActionButton>
          <ActionButton
            onClick={() => onDelete(id)}
            aria-label="Delete message from history"
            title="Delete"
            className="hover:text-red-500"
          >
            <Trash2 size={14} aria-hidden="true" />
          </ActionButton>
        </div>
      </div>

      {isPinned && (
        <span
          className="absolute right-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
          aria-label="Pinned"
        >
          pinned
        </span>
      )}
    </article>
  );
}

function ActionButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={[
        "flex h-7 w-7 items-center justify-center rounded border border-neutral-200",
        "bg-white text-neutral-400 transition-all duration-100",
        "hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-700",
        "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1",
        "dark:border-border dark:bg-black dark:text-neutral-500",
        "dark:hover:bg-neutral-900 dark:hover:text-neutral-200 dark:focus:ring-offset-black",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
