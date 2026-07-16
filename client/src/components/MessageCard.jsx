import React, { useState, useEffect } from "react";
import { Copy, Pin, Play, RotateCcw, Trash2, Zap, Plus, X } from "lucide-react";
import { formatTime } from "../utils/formatTime.js";

function useRelativeTime(timestamp) {
  const [label, setLabel] = useState(() => formatTime(timestamp));

  useEffect(() => {
    setLabel(formatTime(timestamp));
    const interval = setInterval(() => setLabel(formatTime(timestamp)), 30_000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return label;
}

export function MessageCard({
  message,
  isPinned,
  onReuse,
  onReplay,
  onToggleFav,
  onDelete,
  onCopy,
  onAddTag,
  onRemoveTag,
  onAddToQuickReplies,
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

      {/* Tags list and creator */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {(tags || []).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-600 dark:bg-blue-950/45 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30"
          >
            #{tag}
            <button
              onClick={() => onRemoveTag(id, tag)}
              className="ml-0.5 text-blue-400 hover:text-red-500"
              aria-label={`Remove tag ${tag}`}
            >
              <X size={8} aria-hidden="true" />
            </button>
          </span>
        ))}

        {isAddingTag ? (
          <form onSubmit={handleAddTagSubmit} className="inline-flex items-center gap-1">
            <input
              type="text"
              value={newTagText}
              onChange={(e) => setNewTagText(e.target.value)}
              placeholder="Tag..."
              maxLength={15}
              autoFocus
              className="rounded border border-neutral-300 px-1.5 py-0.5 text-[9px] outline-none dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
              style={{ width: "70px" }}
            />
            <button type="submit" className="text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline">Add</button>
            <button type="button" onClick={() => setIsAddingTag(false)} className="text-[9px] text-neutral-400 hover:underline">Cancel</button>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingTag(true)}
            className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-neutral-300 px-2 py-0.5 text-[9px] font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
          >
            <Plus size={8} aria-hidden="true" />
            Tag
          </button>
        )}
      </div>

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
          <ActionButton onClick={() => onAddToQuickReplies(text)} aria-label="Promote to Quick Replies" title="Promote to Quick Reply">
            <Zap size={14} aria-hidden="true" />
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
