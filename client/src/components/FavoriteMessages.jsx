import React, { useMemo, useState } from "react";
import { Pin, X, Search, Filter } from "lucide-react";

const FEW_SHOWN = 6;

export function getPhraseCategory(text = "") {
  const str = text.toLowerCase().trim();
  if (str.includes("?") || /^(what|why|how|when|where|who|can|could|would|is|are|do|does)\b/.test(str)) {
    return "questions";
  }
  if (/(help|need|want|water|food|bathroom|emergency|pain|doctor|medicine|please|urgent)/.test(str)) {
    return "needs";
  }
  if (/(hello|hi|hey|good morning|good evening|goodbye|bye|thanks|thank|welcome|nice)/.test(str)) {
    return "greetings";
  }
  return "social";
}

export function FavoriteMessages({ history, favorites, onReuse, onUnpin }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const totalPinnedCount = useMemo(() => {
    return history.filter((message) => favorites.has(message.id)).length;
  }, [history, favorites]);

  const filteredPinned = useMemo(() => {
    let list = history.filter((message) => favorites.has(message.id));

    if (category !== "all") {
      list = list.filter((msg) => getPhraseCategory(msg.text) === category);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((msg) => msg.text.toLowerCase().includes(q));
    }

    return list;
  }, [history, favorites, category, search]);

  if (totalPinnedCount === 0) return null;

  const displayed = expanded ? filteredPinned : filteredPinned.slice(0, FEW_SHOWN);
  const hasMore = filteredPinned.length > FEW_SHOWN;

  const categories = [
    { key: "all", label: "All" },
    { key: "greetings", label: "Greetings" },
    { key: "needs", label: "Needs" },
    { key: "questions", label: "Questions" },
    { key: "social", label: "Social" },
  ];

  return (
    <section
      aria-labelledby="fav-heading"
      className="flex-shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2.5 space-y-2 dark:border-amber-500/25 dark:bg-black"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Pin size={14} aria-hidden="true" className="text-amber-600 dark:text-amber-400" />
          <h3
            id="fav-heading"
            className="text-[11px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400"
          >
            Pinned phrases ({totalPinnedCount})
          </h3>
        </div>

        {/* Compact Search Bar */}
        <div className="relative flex items-center min-w-[140px] max-w-[200px]">
          <Search size={12} className="pointer-events-none absolute left-2 text-amber-500" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pinned..."
            className="w-full rounded-full border border-amber-200 bg-white py-1 pl-7 pr-6 text-xs text-amber-900 placeholder:text-amber-400/80 outline-none focus:ring-1 focus:ring-amber-400 dark:border-amber-500/30 dark:bg-surface dark:text-amber-200 dark:placeholder:text-amber-500/60"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear pinned search"
              className="absolute right-1.5 text-amber-500 hover:text-amber-700 dark:hover:text-amber-200"
            >
              <X size={12} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Category Tag Chips */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5" role="tablist" aria-label="Pinned phrase categories">
        {categories.map((cat) => {
          const isActive = category === cat.key;
          return (
            <button
              key={cat.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setCategory(cat.key)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all ${
                isActive
                  ? "bg-amber-600 text-white shadow-sm dark:bg-amber-500 dark:text-black"
                  : "bg-white/80 text-amber-800 hover:bg-amber-100 dark:bg-surface dark:text-amber-300 dark:hover:bg-amber-900/40"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Pinned Phrase List */}
      <div className="flex flex-wrap items-center gap-1.5" role="list" aria-label="Pinned phrases">
        {displayed.length === 0 ? (
          <p className="text-xs italic text-amber-700/70 dark:text-amber-400/70 py-1">
            No pinned phrases found in this category.
          </p>
        ) : (
          displayed.map((message) => (
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
          ))
        )}

        {hasMore && (
          <button
            onClick={() => setExpanded((value) => !value)}
            className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs text-amber-700 transition hover:bg-amber-100 focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-amber-500/30 dark:bg-surface dark:text-amber-300 dark:hover:bg-amber-500/15"
            aria-label={expanded ? "Show fewer pinned phrases" : `Show ${filteredPinned.length - FEW_SHOWN} more pinned phrases`}
          >
            {expanded ? "Show less" : `+${filteredPinned.length - FEW_SHOWN} more`}
          </button>
        )}
      </div>
    </section>
  );
}
