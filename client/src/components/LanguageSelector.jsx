// Searchable, accessible language picker with flag indicators and region grouping.
//
// Used on the Call page, Compose page (compact mode), and Settings page
// as the unified way to select an output language for ElevenLabs TTS.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check, Search, Globe, X } from "lucide-react";
import {
  SUPPORTED_LANGUAGES,
  getLanguageByCode,
  getRegions,
} from "../utils/languages.js";

/**
 * LanguageSelector — premium dropdown for multilingual voice selection.
 *
 * @param {object}   props
 * @param {string}   props.value     – current language code (e.g. "en") or "" for auto-detect
 * @param {function} props.onChange   – called with the selected language code
 * @param {string}   [props.id]      – HTML id for the trigger button
 * @param {boolean}  [props.compact] – smaller variant for inline/toolbar usage
 */
export function LanguageSelector({ value, onChange, id, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusIndex, setFocusIndex] = useState(-1);

  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const selectedLang = getLanguageByCode(value);
  const regions = useMemo(() => getRegions(), []);

  // ── Filtered language list ────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return SUPPORTED_LANGUAGES;
    const q = search.toLowerCase().trim();
    return SUPPORTED_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [search]);

  // Build flat list: [auto-detect, ...grouped items] for keyboard nav
  const flatItems = useMemo(() => {
    const items = [{ type: "auto", code: "", name: "Auto-detect" }];
    const filteredRegions = regions.filter((r) =>
      filtered.some((l) => l.region === r)
    );
    for (const region of filteredRegions) {
      items.push({ type: "header", region });
      for (const lang of filtered.filter((l) => l.region === region)) {
        items.push({ type: "lang", ...lang });
      }
    }
    return items;
  }, [filtered, regions]);

  // Only selectable items (skip headers) for keyboard focus
  const selectableIndices = useMemo(
    () => flatItems.reduce((acc, item, i) => {
      if (item.type !== "header") acc.push(i);
      return acc;
    }, []),
    [flatItems]
  );

  // ── Open / Close ──────────────────────────────────────────────────────
  const openDropdown = useCallback(() => {
    setIsOpen(true);
    setSearch("");
    setFocusIndex(-1);
    // Focus the search input after render
    requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearch("");
    setFocusIndex(-1);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) closeDropdown();
    else openDropdown();
  }, [isOpen, openDropdown, closeDropdown]);

  // ── Click outside ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeDropdown();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, closeDropdown]);

  // ── Select handler ────────────────────────────────────────────────────
  const selectLanguage = useCallback(
    (code) => {
      onChange(code);
      closeDropdown();
    },
    [onChange, closeDropdown]
  );

  // ── Keyboard nav ──────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          openDropdown();
        }
        return;
      }

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          closeDropdown();
          break;
        case "ArrowDown": {
          e.preventDefault();
          const currentSelIdx = selectableIndices.indexOf(focusIndex);
          const nextSelIdx = Math.min(currentSelIdx + 1, selectableIndices.length - 1);
          const next = selectableIndices[nextSelIdx];
          if (next !== undefined) {
            setFocusIndex(next);
            scrollToItem(next);
          }
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const currentSelIdx = selectableIndices.indexOf(focusIndex);
          const prevSelIdx = Math.max(currentSelIdx - 1, 0);
          const prev = selectableIndices[prevSelIdx];
          if (prev !== undefined) {
            setFocusIndex(prev);
            scrollToItem(prev);
          }
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (focusIndex >= 0 && flatItems[focusIndex]) {
            selectLanguage(flatItems[focusIndex].code);
          }
          break;
        }
        default:
          break;
      }
    },
    [isOpen, focusIndex, flatItems, selectableIndices, openDropdown, closeDropdown, selectLanguage]
  );

  function scrollToItem(index) {
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector(`[data-index="${index}"]`);
    if (item) {
      item.scrollIntoView({ block: "nearest" });
    }
  }

  // ── Trigger button label ──────────────────────────────────────────────
  const triggerLabel = selectedLang
    ? `${selectedLang.flag} ${selectedLang.name}`
    : "🌐 Auto-detect";

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {/* ── Trigger Button ─────────────────────────────────────────────── */}
      <button
        id={id}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select output language"
        className={[
          "group inline-flex items-center gap-2 rounded-lg border font-medium transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-moss/40 dark:focus:ring-glow/40",
          compact
            ? "px-3 py-2 text-sm"
            : "w-full px-4 py-3 text-sm",
          isOpen
            ? "border-moss bg-mint/20 text-ink dark:border-glow dark:bg-glow/10 dark:text-neutral-100"
            : "border-neutral-200 bg-white text-neutral-700 hover:border-moss/50 hover:bg-moss/5 dark:border-border dark:bg-black dark:text-neutral-200 dark:hover:border-glow/50 dark:hover:bg-glow/5",
        ].join(" ")}
      >
        <span className="flex-1 text-left truncate">{triggerLabel}</span>
        <ChevronDown
          size={compact ? 14 : 16}
          aria-hidden="true"
          className={[
            "flex-shrink-0 transition-transform duration-200 text-neutral-400 dark:text-neutral-500",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {/* ── Dropdown Panel ─────────────────────────────────────────────── */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Language selection"
          className={[
            "absolute z-50 mt-2 flex flex-col overflow-hidden rounded-xl border shadow-lg",
            "border-neutral-200/80 bg-white dark:border-border dark:bg-surface",
            "animate-fade-in-up",
            compact ? "right-0 w-72" : "left-0 right-0 min-w-[320px] sm:w-96",
          ].join(" ")}
          style={{ maxHeight: "420px" }}
        >
          {/* Search bar */}
          <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2.5 dark:border-border">
            <Search
              size={15}
              aria-hidden="true"
              className="flex-shrink-0 text-neutral-400 dark:text-neutral-500"
            />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setFocusIndex(-1);
              }}
              placeholder="Search languages..."
              aria-label="Search languages"
              className="flex-1 bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                className="rounded p-0.5 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
                aria-label="Clear search"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Scrollable list */}
          <div
            ref={listRef}
            role="listbox"
            aria-label="Available languages"
            className="overflow-y-auto overscroll-contain"
            style={{ maxHeight: "360px" }}
          >
            {filtered.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-neutral-400 dark:text-neutral-500">
                No languages match "{search}"
              </p>
            )}

            {flatItems.map((item, index) => {
              if (item.type === "auto") {
                const isSelected = !value;
                const isFocused = focusIndex === index;
                return (
                  <button
                    key="auto-detect"
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-index={index}
                    onClick={() => selectLanguage("")}
                    onMouseEnter={() => setFocusIndex(index)}
                    className={[
                      "flex w-full items-center gap-3 border-b border-neutral-100 px-4 py-3 text-left text-sm transition-colors dark:border-border",
                      isFocused
                        ? "bg-moss/8 dark:bg-glow/8"
                        : "hover:bg-neutral-50 dark:hover:bg-white/5",
                      isSelected
                        ? "font-semibold text-moss dark:text-glow"
                        : "text-neutral-700 dark:text-neutral-300",
                    ].join(" ")}
                  >
                    <Globe size={18} aria-hidden="true" className="flex-shrink-0 text-neutral-400 dark:text-neutral-500" />
                    <span className="flex-1">Auto-detect</span>
                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                      Let AI detect
                    </span>
                    {isSelected && (
                      <Check size={15} aria-hidden="true" className="flex-shrink-0 text-moss dark:text-glow" />
                    )}
                  </button>
                );
              }

              if (item.type === "header") {
                return (
                  <div
                    key={`region-${item.region}`}
                    className="sticky top-0 z-10 bg-neutral-50/95 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-neutral-400 backdrop-blur-sm dark:bg-surface/95 dark:text-neutral-500"
                    role="presentation"
                  >
                    {item.region}
                  </div>
                );
              }

              // item.type === "lang"
              const isSelected = value === item.code;
              const isFocused = focusIndex === index;
              return (
                <button
                  key={item.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-index={index}
                  onClick={() => selectLanguage(item.code)}
                  onMouseEnter={() => setFocusIndex(index)}
                  className={[
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                    isFocused
                      ? "bg-moss/8 dark:bg-glow/8"
                      : "hover:bg-neutral-50 dark:hover:bg-white/5",
                    isSelected
                      ? "font-semibold text-moss dark:text-glow"
                      : "text-neutral-700 dark:text-neutral-300",
                  ].join(" ")}
                >
                  <span className="flex-shrink-0 text-lg leading-none" aria-hidden="true">
                    {item.flag}
                  </span>
                  <span className="flex-1 truncate">
                    {item.name}
                    <span className="ml-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                      {item.nativeName !== item.name ? item.nativeName : ""}
                    </span>
                  </span>
                  <span className="flex-shrink-0 font-mono text-[11px] text-neutral-300 dark:text-neutral-600">
                    {item.code}
                  </span>
                  {isSelected && (
                    <Check size={15} aria-hidden="true" className="flex-shrink-0 text-moss dark:text-glow" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="border-t border-neutral-100 px-4 py-2 dark:border-border">
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
              <kbd className="rounded border border-neutral-200 px-1 font-mono text-[10px] dark:border-border">↑↓</kbd>{" "}
              navigate{" · "}
              <kbd className="rounded border border-neutral-200 px-1 font-mono text-[10px] dark:border-border">Enter</kbd>{" "}
              select{" · "}
              <kbd className="rounded border border-neutral-200 px-1 font-mono text-[10px] dark:border-border">Esc</kbd>{" "}
              close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
