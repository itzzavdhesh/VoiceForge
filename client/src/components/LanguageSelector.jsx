// Searchable, accessible language picker with flag indicators and region grouping.
//
// Used on the Call page, Compose page (compact mode), and Settings page
// as the unified way to select an output language for Chatterbox TTS.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check, Search, Globe } from "lucide-react";
import {
  SUPPORTED_LANGUAGES,
  getLanguageByCode,
  getRegions,
} from "../utils/languages.js";

export function LanguageSelector({ value, onChange, id = "lang-selector", compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusIndex, setFocusIndex] = useState(-1);

  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const triggerRef = useRef(null);

  // Dynamic IDs to prevent collision when multiple selectors are on the page
  const listboxId = `lang-listbox-${id}`;
  const getOptionId = (index) => `opt-${id}-${index}`;

  const selectedLang = getLanguageByCode(value);
  const regions = useMemo(() => getRegions(), []);

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

  const selectableIndices = useMemo(
    () => flatItems.reduce((acc, item, i) => {
      if (item.type !== "header") acc.push(i);
      return acc;
    }, []),
    [flatItems]
  );

  const openDropdown = useCallback(() => {
    setIsOpen(true);
    setSearch("");
    setFocusIndex(-1);
    requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  const closeDropdown = useCallback((refocus = false) => {
    setIsOpen(false);
    setSearch("");
    setFocusIndex(-1);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) closeDropdown(true);
    else openDropdown();
  }, [isOpen, openDropdown, closeDropdown]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, closeDropdown]);

  const selectLanguage = useCallback((code) => {
    onChange(code);
    closeDropdown(true);
  }, [onChange, closeDropdown]);

  const handleKeyDown = useCallback((e) => {
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
        closeDropdown(true);
        break;
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        const currentSelIdx = selectableIndices.indexOf(focusIndex);
        const nextSelIdx = e.key === "ArrowDown" 
          ? Math.min(currentSelIdx + 1, selectableIndices.length - 1)
          : Math.max(currentSelIdx - 1, 0);
        const next = selectableIndices[nextSelIdx];
        if (next !== undefined) {
          setFocusIndex(next);
          const item = listRef.current?.querySelector(`[data-index="${next}"]`);
          if (item) item.scrollIntoView({ block: "nearest" });
        }
        break;
      }
      case "Enter":
        e.preventDefault();
        if (focusIndex >= 0 && flatItems[focusIndex]) {
          selectLanguage(flatItems[focusIndex].code);
        }
        break;
    }
  }, [isOpen, focusIndex, flatItems, selectableIndices, openDropdown, closeDropdown, selectLanguage]);

  const triggerLabel = selectedLang ? `${selectedLang.flag} ${selectedLang.name}` : "🌐 Auto-detect";

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select output language"
        className={[
          "group inline-flex items-center gap-2 rounded-lg border font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-moss/40",
          compact ? "px-3 py-2 text-sm" : "w-full px-4 py-3 text-sm",
          isOpen ? "border-moss bg-mint/20 text-ink" : "border-neutral-200 bg-white text-neutral-700 hover:border-moss/50",
        ].join(" ")}
      >
        <span className="flex-1 text-left truncate">{triggerLabel}</span>
        <ChevronDown size={compact ? 14 : 16} className={isOpen ? "rotate-180" : ""} />
      </button>

      {isOpen && (
        <div
          role="dialog"
          className="absolute z-50 mt-2 flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg animate-fade-in-up"
          style={{ maxHeight: "420px", right: compact ? 0 : "auto", left: compact ? "auto" : 0, minWidth: "320px" }}
        >
          <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2.5">
            <Search size={15} className="text-neutral-400" />
            <input
              ref={searchRef}
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-label="Search languages"
              aria-activedescendant={focusIndex >= 0 ? getOptionId(focusIndex) : undefined}
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setFocusIndex(-1); }}
              placeholder="Search languages..."
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>

          <ul
            id={listboxId}
            ref={listRef}
            role="listbox"
            className="overflow-y-auto overscroll-contain"
            style={{ maxHeight: "360px" }}
          >
            {flatItems.map((item, index) => {
              if (item.type === "header") return (
                <li key={`r-${item.region}`} role="presentation" className="sticky top-0 bg-neutral-50 px-4 py-2 text-[10px] font-bold uppercase text-neutral-400">
                  {item.region}
                </li>
              );
              
              const isSelected = item.type === "auto" ? !value : value === item.code;
              return (
                <li
                  key={item.code || "auto"}
                  id={getOptionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  data-index={index}
                  onClick={() => selectLanguage(item.code)}
                  className={[
                    "flex w-full items-center gap-3 px-4 py-2.5 text-sm cursor-pointer",
                    focusIndex === index ? "bg-moss/10" : "",
                    isSelected ? "text-moss font-semibold" : "text-neutral-700",
                  ].join(" ")}
                >
                  {item.type !== "auto" && <span className="text-lg">{item.flag}</span>}
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
