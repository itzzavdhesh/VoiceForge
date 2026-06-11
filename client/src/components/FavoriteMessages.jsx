import React, { useState } from "react";
import { Pin, X } from "lucide-react";

const FEW_SHOWN = 5;

export function FavoriteMessages({ history, favorites, onReuse, onUnpin }) {
  const [expanded, setExpanded] = useState(false);

  const pinned = history.filter((message) => favorites.has(message.id));
  if (pinned.length === 0) return null;

  const displayed = expanded ? pinned : pinned.slice(0, FEW_SHOWN);
  const hasMore = pinned.length > FEW_SHOWN;

  return (
    <section
      aria-labelledby="fav-heading"
      className="flex-shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-500/25 dark:bg-black"
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <Pin size={14} aria-hidden="true" className="text-amber-600 dark:text-amber-400" />
        <h3
          id="fav-heading"
          className="text-[11px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400"
        >
          Pinned phrases
        </h3>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="list" aria-label="Pinned phrases">
        {displayed.map((message) => (
          <div
            key={message.id}
            role="listitem"
            className="flex items-center gap-1 rounded-full border border-amber-200 bg-white py-1 pl-3 pr-1 text-xs text-amber-800 shadow-none dark:border-amber-500/30 dark:bg-surface dark:text-amber-300"
          >
            <button
              onClick={() => onReuse(message.text)}
              className="max-w-[150px] truncate text-left focus:outline-none focus:underline sm:max-w-[180px]"
              aria-label={`Load pinned phrase: ${message.text}`}
              title={message.text}
            >
              {message.text}
            </button>
            <button
              onClick={() => onUnpin(message.id)}
              className="ml-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-amber-500 transition hover:bg-amber-100 hover:text-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-400 dark:hover:bg-amber-500/15"
              aria-label={`Unpin: ${message.text}`}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
        ))}

        {hasMore && (
          <button
            onClick={() => setExpanded((value) => !value)}
            className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs text-amber-700 transition hover:bg-amber-100 focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-amber-500/30 dark:bg-surface dark:text-amber-300 dark:hover:bg-amber-500/15"
            aria-label={expanded ? "Show fewer pinned phrases" : `Show ${pinned.length - FEW_SHOWN} more pinned phrases`}
          >
            {expanded ? "Show less" : `+${pinned.length - FEW_SHOWN} more`}
          </button>
        )}
      </div>
    </section>
  );
}
