import React, { useMemo, useState, useDeferredValue } from "react";
import { ChevronLeft, ChevronRight, Inbox, Pin, Search, Trash2, Download } from "lucide-react";
import { MessageCard } from "./MessageCard";
import useDebounce from "../hooks/useDebounce";

export function SpeechHistory({
  history,
  favorites,
  sessionTranscript = [],
  onReuse,
  onReplay,
  onToggleFav,
  onDelete,
  onClearHistory,
  onCopy,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const visible = useMemo(() => {
    let messages = tab === "pinned" ? history.filter((message) => favorites.has(message.id)) : history;

    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      messages = messages.filter((message) => message.text.toLowerCase().includes(query));
    }

    return messages;
  }, [history, favorites, tab, debouncedSearch]);

  const tabs = ["all", "pinned"];

  function handleTabKeyDown(event, currentIndex) {
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;

    if (nextIndex !== currentIndex) setTab(tabs[nextIndex]);
  }

  function handleClearHistory() {
    if (window.confirm("Clear all history? Pinned messages will also be removed.")) {
      onClearHistory();
    }
  }

  function handleExportTranscript() {
    if (!sessionTranscript || sessionTranscript.length === 0) return;
    
    const formattedText = sessionTranscript
      .map(item => `[${new Date(item.timestamp).toLocaleTimeString()}] ${item.text}`)
      .join("\n");
      
    const blob = new Blob([formattedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Transcript-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <aside
      className={[
        "flex flex-shrink-0 flex-col border-r border-neutral-200 bg-neutral-50",
        "h-full transition-all duration-200 dark:border-border dark:bg-black",
        collapsed ? "w-12" : "w-[min(80vw,320px)]",
      ].join(" ")}
      aria-label="Speech history"
    >
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-neutral-200 px-3 py-3 dark:border-border">
        <button
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand history panel" : "Collapse history panel"}
          aria-expanded={!collapsed}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-border dark:bg-surface dark:text-neutral-400 dark:hover:bg-neutral-900"
        >
          {collapsed ? <ChevronRight size={15} aria-hidden="true" /> : <ChevronLeft size={15} aria-hidden="true" />}
        </button>

        {!collapsed && (
          <>
            <span className="flex-1 truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">
              History
            </span>
            {history.length > 0 && (
              <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600 dark:bg-surface dark:text-neutral-300">
                {history.length}
              </span>
            )}
          </>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="flex-shrink-0 border-b border-neutral-200 px-3 py-2 dark:border-border">
            <label htmlFor="vf-search" className="sr-only">
              Search history
            </label>
            <div className="relative">
              <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                id="vf-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search messages..."
                className="w-full rounded-md border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-border dark:bg-surface dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:ring-blue-500/30"
              />
            </div>
          </div>

          <div
            className="flex flex-shrink-0 gap-1 border-b border-neutral-200 px-3 pt-2 dark:border-border"
            role="tablist"
            aria-label="Speech history tabs"
          >
            {[
              { key: "all", label: "All" },
              { key: "pinned", label: "Pinned" },
            ].map(({ key, label }, index) => (
              <button
                key={key}
                id={`tab-${key}`}
                role="tab"
                aria-selected={tab === key}
                aria-controls={`panel-${key}`}
                tabIndex={tab === key ? 0 : -1}
                onClick={() => setTab(key)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={[
                  "rounded-t-md px-3 py-1.5 text-xs font-medium transition",
                  "focus:outline-none focus:ring-2 focus:ring-blue-400",
                  tab === key
                    ? "border border-b-white border-neutral-200 bg-white text-blue-600 dark:border-border dark:border-b-black dark:bg-black dark:text-blue-400"
                    : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            id={`panel-${tab}`}
            className="flex-1 overflow-y-auto p-3 focus:outline-none"
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            aria-label={tab === "pinned" ? "Pinned messages" : "All messages"}
            tabIndex={0}
          >
            {visible.length === 0 ? (
              <EmptyState tab={tab} hasSearch={Boolean(debouncedSearch.trim())} />
            ) : (
              <ul className="space-y-2" aria-label="Message list">
                {visible.map((message) => (
                  <li key={message.id}>
                    <MessageCard
                      message={message}
                      isPinned={favorites.has(message.id)}
                      onReuse={onReuse}
                      onReplay={onReplay}
                      onToggleFav={onToggleFav}
                      onDelete={onDelete}
                      onCopy={onCopy}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {history.length > 0 && (
            <div className="flex flex-col gap-2 flex-shrink-0 border-t border-neutral-200 p-2 dark:border-border">
              {sessionTranscript && sessionTranscript.length > 0 && (
                <button
                  onClick={handleExportTranscript}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:border-border dark:text-neutral-300 dark:hover:border-blue-800 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                >
                  <Download size={13} aria-hidden="true" />
                  Export Transcript
                </button>
              )}
              <button
                onClick={handleClearHistory}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 dark:border-border dark:hover:border-red-800 dark:hover:bg-red-500/15 dark:hover:text-red-400"
              >
                <Trash2 size={13} aria-hidden="true" />
                Clear all history
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}

function EmptyState({ tab, hasSearch }) {
  const Icon = tab === "pinned" ? Pin : Inbox;
  const title = hasSearch
    ? "No messages match your search."
    : tab === "pinned"
      ? "No pinned messages yet."
      : "No history yet.";
  const detail = hasSearch
    ? ""
    : tab === "pinned"
      ? "Pin a message to keep it here."
      : "Speak a message to get started.";

  return (
    <div className="flex flex-col items-center py-10 text-center text-sm text-neutral-400">
      <Icon size={28} aria-hidden="true" className="mb-2" />
      <p>{title}</p>
      {detail && <p>{detail}</p>}
    </div>
  );
}
