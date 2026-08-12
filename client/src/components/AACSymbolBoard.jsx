import React, { useState } from "react";
import { Grid, Heart, AlertTriangle, Activity, Sparkles, X } from "lucide-react";

export const AAC_SYMBOL_CATEGORIES = [
  {
    key: "needs",
    label: "Needs",
    icon: Heart,
    color: "bg-blue-500",
    symbols: [
      { text: "I need water, please.", icon: "💧", label: "Water" },
      { text: "I am hungry and need food.", icon: "🍎", label: "Food" },
      { text: "I need to use the restroom.", icon: "🚻", label: "Restroom" },
      { text: "I need my medicine.", icon: "💊", label: "Medicine" },
      { text: "I need to rest.", icon: "🛏️", label: "Rest" },
      { text: "I am feeling cold.", icon: "❄️", label: "Cold" },
      { text: "I am feeling warm.", icon: "🔥", label: "Warm" },
      { text: "I need assistance.", icon: "🙋", label: "Help" },
    ],
  },
  {
    key: "emergency",
    label: "Emergency",
    icon: AlertTriangle,
    color: "bg-red-500",
    symbols: [
      { text: "Emergency! I need help immediately!", icon: "🚨", label: "Emergency" },
      { text: "I am experiencing pain.", icon: "😣", label: "Pain" },
      { text: "Please call a doctor.", icon: "🩺", label: "Doctor" },
      { text: "Please call 911.", icon: "📞", label: "Call 911" },
      { text: "I feel dizzy or lightheaded.", icon: "😵‍💫", label: "Dizzy" },
      { text: "I cannot breathe well.", icon: "🫁", label: "Breathing" },
    ],
  },
  {
    key: "feelings",
    label: "Feelings",
    icon: Sparkles,
    color: "bg-amber-500",
    symbols: [
      { text: "I am happy.", icon: "😊", label: "Happy" },
      { text: "I am sad.", icon: "😔", label: "Sad" },
      { text: "I am tired.", icon: "😴", label: "Tired" },
      { text: "I am confused.", icon: "😕", label: "Confused" },
      { text: "I am grateful and thankful.", icon: "🙏", label: "Grateful" },
      { text: "I am nervous.", icon: "😟", label: "Nervous" },
    ],
  },
  {
    key: "actions",
    label: "Actions",
    icon: Activity,
    color: "bg-emerald-500",
    symbols: [
      { text: "Yes", icon: "👍", label: "Yes" },
      { text: "No", icon: "👎", label: "No" },
      { text: "Please stop.", icon: "🛑", label: "Stop" },
      { text: "Please continue.", icon: "▶️", label: "Continue" },
      { text: "I have a question.", icon: "❓", label: "Question" },
      { text: "I want to go home.", icon: "🏠", label: "Home" },
      { text: "Hello, good day!", icon: "👋", label: "Hello" },
      { text: "Thank you so much.", icon: "💙", label: "Thanks" },
    ],
  },
];

export function AACSymbolBoard({ onSelectSymbol, onClose }) {
  const [activeCategory, setActiveCategory] = useState("needs");

  const currentCategory = AAC_SYMBOL_CATEGORIES.find((cat) => cat.key === activeCategory) || AAC_SYMBOL_CATEGORIES[0];

  return (
    <div
      aria-label="AAC Picture Symbol Board"
      className="rounded-lg border border-neutral-200 bg-white p-3.5 shadow-md dark:border-border dark:bg-surface"
    >
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 pb-2.5 dark:border-border">
        <div className="flex items-center gap-1.5">
          <Grid size={16} className="text-moss dark:text-glow" aria-hidden="true" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink dark:text-neutral-200">
            AAC Picture-Symbol Board
          </h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AAC symbol board"
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1" role="tablist">
        {AAC_SYMBOL_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCategory(cat.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-moss text-white shadow-sm dark:bg-glow dark:text-black"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-black dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              <Icon size={12} aria-hidden="true" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Symbol Cards Grid */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="list">
        {currentCategory.symbols.map((sym) => (
          <button
            key={sym.label}
            type="button"
            role="listitem"
            onClick={() => onSelectSymbol?.(sym.text)}
            className="group flex flex-col items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50/60 p-2.5 text-center transition-all hover:border-moss hover:bg-emerald-50/50 hover:shadow-soft active:scale-95 dark:border-border dark:bg-black dark:hover:border-glow dark:hover:bg-glow/10"
            title={sym.text}
          >
            <span className="text-2xl transition-transform group-hover:scale-110" role="img" aria-label={sym.label}>
              {sym.icon}
            </span>
            <span className="mt-1 text-xs font-bold text-ink dark:text-neutral-200">
              {sym.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
