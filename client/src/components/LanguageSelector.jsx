import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check, Search, Globe, X } from "lucide-react";
import { SUPPORTED_LANGUAGES, getLanguageByCode, getRegions } from "../utils/languages.js";

export function LanguageSelector({ value, onChange, id, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusIndex, setFocusIndex] = useState(-1);
  const [panelStyle, setPanelStyle] = useState(null);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const generatedId = useId();
  const panelId = id ?? generatedId;
  const listRef = useRef(null);
  const triggerRef = useRef(null);

  const selectedLang = getLanguageByCode(value);
  const regions = useMemo(() => getRegions(), []);

  const filtered = useMemo(() => {
    if (!search.trim()) return SUPPORTED_LANGUAGES;
    const q = search.toLowerCase().trim();
    return SUPPORTED_LANGUAGES.filter(
      (l) => l.name.toLowerCase().includes(q) || l.nativeName.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
    );
  }, [search]);

  const flatItems = useMemo(() => {
    const items = [{ type: "auto", code: "", name: "Auto-detect" }];
    const filteredRegions = regions.filter((r) => filtered.some((l) => l.region === r));
    for (const region of filteredRegions) {
      items.push({ type: "header", region });
      for (const lang of filtered.filter((l) => l.region === region)) {
        items.push({ type: "lang", ...lang });
      }
    }
    return items;
  }, [filtered, regions]);

  const selectableIndices = useMemo(() => flatItems.reduce((acc, item, i) => {
    if (item.type !== "header") acc.push(i);
    return acc;
  }, []), [flatItems]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearch("");
    setFocusIndex(-1);
    triggerRef.current?.focus();
  }, []);

  const openDropdown = useCallback(() => {
    setIsOpen(true);
    setSearch("");
    setFocusIndex(-1);
    // Restore focus to the trigger button
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const toggle = useCallback(() => (isOpen ? closeDropdown() : openDropdown()), [isOpen, openDropdown, closeDropdown]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) closeDropdown();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, closeDropdown]);

  const selectLanguage = useCallback((code) => {
    onChange(code);
    closeDropdown();
  }, [onChange, closeDropdown]);

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (["Enter", " ", "ArrowDown"].includes(e.key)) { e.preventDefault(); openDropdown(); }
      return;
    }
    switch (e.key) {
      case "Escape": e.preventDefault(); closeDropdown(); break;
      case "ArrowDown": e.preventDefault();
        const nextIdx = selectableIndices[Math.min(selectableIndices.indexOf(focusIndex) + 1, selectableIndices.length - 1)];
        if (nextIdx !== undefined) { setFocusIndex(nextIdx); scrollToItem(nextIdx); }
        break;
      case "ArrowUp": e.preventDefault();
        const prevIdx = selectableIndices[Math.max(selectableIndices.indexOf(focusIndex) - 1, 0)];
        if (prevIdx !== undefined) { setFocusIndex(prevIdx); scrollToItem(prevIdx); }
        break;
      case "Enter": e.preventDefault();
        if (focusIndex >= 0 && flatItems[focusIndex]) selectLanguage(flatItems[focusIndex].code);
        break;
    }
  }, [isOpen, focusIndex, flatItems, selectableIndices, openDropdown, closeDropdown, selectLanguage]);

  function scrollToItem(index) {
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector(`[data-index="${index}"]`);
    if (item) item.scrollIntoView({ block: "nearest" });
  }

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {/* ── Trigger Button ─────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        id={id}
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select output language"
        aria-controls={isOpen ? `${panelId}-panel` : undefined}
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
        <span className="flex-1 text-left truncate">{selectedLang ? `${selectedLang.flag} ${selectedLang.name}` : "🌐 Auto-detect"}</span>
        <ChevronDown size={compact ? 14 : 16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          id={`${panelId}-panel`}
          role="dialog"
          aria-label="Language selection"
          className={[
            "flex flex-col overflow-hidden rounded-xl border shadow-lg animate-fade-in-up",
            "border-neutral-200/80 bg-white dark:border-border dark:bg-surface",
          ].join(" ")}
          style={panelStyle}
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
              aria-activedescendant={focusIndex >= 0 && flatItems[focusIndex] ? `lang-option-${flatItems[focusIndex].code ?? "auto"}` : undefined}
              className="flex-1 bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
            {search && <button type="button" aria-label="Clear language search" onClick={() => { setSearch(""); searchRef.current?.focus(); }}><X size={14} /></button>}
          </div>

          <ul 
            ref={listRef} 
            id={id ? `${id}-listbox` : "language-listbox"}
            role="listbox" 
            aria-label="Available languages"
            className="overflow-y-auto overscroll-contain max-h-[360px]"
          >
            {flatItems.length === 1 && (
              <li role="presentation" className="px-4 py-8 text-center text-sm text-neutral-400">No matches</li>
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
                    id="lang-option-auto"
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
              const optionId = id ? `${id}-option-${index}` : `option-${index}`;
              
              return (
                <li
                  key={item.code || "auto"}
                  id={optionId}
                  role="option"
                  id={`lang-option-${item.code}`}
                  aria-selected={isSelected}
                  data-index={index}
                  onClick={() => selectLanguage(item.code)}
                  onMouseEnter={() => setFocusIndex(index)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm cursor-pointer ${focusIndex === index ? "bg-moss/8" : ""} ${isSelected ? "font-semibold text-moss dark:text-glow" : "text-neutral-700 dark:text-neutral-300"}`}>
                  <span className="text-lg" aria-hidden="true">{item.type === "auto" ? "🌐" : item.flag}</span>
                  <span className="flex-1 truncate">{item.name}</span>
                  {isSelected && <Check size={15} />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
