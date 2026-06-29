import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check, Search, Globe, X } from "lucide-react";
import { SUPPORTED_LANGUAGES, getLanguageByCode, getRegions } from "../utils/languages.js";

export function LanguageSelector({ value, onChange, id, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusIndex, setFocusIndex] = useState(-1);

  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const triggerRef = useRef(null); // Added for focus restoration

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
    triggerRef.current?.focus(); // Restore focus to the trigger button
  }, []);

  const openDropdown = useCallback(() => {
    setIsOpen(true);
    setSearch("");
    setFocusIndex(-1);
    requestAnimationFrame(() => searchRef.current?.focus());
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
      <button ref={triggerRef} id={id} type="button" onClick={toggle} aria-haspopup="listbox" aria-expanded={isOpen} aria-label="Select output language"
        className={`group inline-flex items-center gap-2 rounded-lg border font-medium transition-all duration-200 ${compact ? "px-3 py-2 text-sm" : "w-full px-4 py-3 text-sm"} ${isOpen ? "border-moss bg-mint/20 text-ink dark:border-glow dark:bg-glow/10" : "border-neutral-200 bg-white dark:border-border dark:bg-black"}`}>
        <span className="flex-1 text-left truncate">{selectedLang ? `${selectedLang.flag} ${selectedLang.name}` : "🌐 Auto-detect"}</span>
        <ChevronDown size={compact ? 14 : 16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div role="dialog" tabIndex={-1} aria-label="Language selection" className={`absolute z-50 mt-2 flex flex-col overflow-hidden rounded-xl border shadow-lg border-neutral-200 bg-white dark:border-border dark:bg-surface animate-fade-in-up ${compact ? "right-0 w-72" : "left-0 right-0 min-w-[320px] sm:w-96"}`} style={{ maxHeight: "420px" }}>
          <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2.5 dark:border-border">
            <Search size={15} className="text-neutral-400" />
            <input 
              ref={searchRef} 
              type="text" 
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-controls={id ? `${id}-listbox` : "language-listbox"}
              aria-activedescendant={focusIndex >= 0 ? (id ? `${id}-option-${focusIndex}` : `option-${focusIndex}`) : undefined}
              aria-label="Search languages" 
              value={search} 
              onChange={(e) => { setSearch(e.target.value); setFocusIndex(-1); }} 
              placeholder="Search languages..." 
              className="flex-1 bg-transparent text-sm outline-none" 
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
              if (item.type === "header") return <li key={item.region} role="presentation" className="sticky top-0 bg-neutral-50 px-4 py-2 text-[11px] font-bold uppercase text-neutral-400">{item.region}</li>;
              
              const isSelected = value === item.code;
              const optionId = id ? `${id}-option-${index}` : `option-${index}`;
              
              return (
                <li
                  key={item.code || "auto"}
                  id={optionId}
                  role="option"
                  aria-selected={isSelected}
                  data-index={index}
                  onClick={() => selectLanguage(item.code)}
                  onMouseEnter={() => setFocusIndex(index)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm cursor-pointer ${focusIndex === index ? "bg-moss/8" : ""} ${isSelected ? "font-semibold text-moss" : ""}`}>
                  <span className="text-lg">{item.type === "auto" ? "🌐" : item.flag}</span>
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
