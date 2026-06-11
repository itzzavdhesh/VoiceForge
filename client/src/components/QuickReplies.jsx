import React, { useState, useEffect } from "react";
import { Plus, X, Check } from "lucide-react";
import { useToast, ToastContainer } from "./useToast.jsx";

const CATEGORIES = ["General", "Social", "Needs", "Urgent"];

const DEFAULT_QUICK_REPLIES = [
  { label: "Hello", phrase: "Hello", category: "Social" },
  { label: "Thank you", phrase: "Thank you", category: "Social" },
  { label: "Please wait", phrase: "Please wait", category: "Urgent" },
  { label: "I need help", phrase: "I need help", category: "Urgent" },
  { label: "Can you repeat that?", phrase: "Can you repeat that?", category: "Needs" },
  { label: "Yes, I understand", phrase: "Yes, I understand", category: "Social" },
  { label: "No, thank you", phrase: "No, thank you", category: "Needs" },
];

const STORAGE_KEY = "vf_quick_replies";

export function QuickReplies({ onSelect }) {
  const [replies, setReplies] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === null) return DEFAULT_QUICK_REPLIES;
      const parsed = JSON.parse(saved);
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => item && typeof item.phrase === "string" && typeof item.label === "string")
      ) {
        return parsed.map((item) => ({
          ...item,
          category: item.category && CATEGORIES.includes(item.category) ? item.category : "General",
        }));
      }
      return DEFAULT_QUICK_REPLIES;
    } catch {
      return DEFAULT_QUICK_REPLIES;
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newPhrase, setNewPhrase] = useState("");
  const [selectedCategoryTab, setSelectedCategoryTab] = useState("All");
  const [newCategory, setNewCategory] = useState("General");

  const { toasts, showToast } = useToast();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(replies));
    } catch {
      console.error('Failed to persist quick replies to localStorage');
    }
  }, [replies]);

  const handleAdd = (e) => {
    e.preventDefault();
    const cleanPhrase = newPhrase.trim();

    if (cleanPhrase.length > 120) {
      showToast("Phrase is too long (max 120 characters)", "error");
      return;
    }

    if (!cleanPhrase) {
      showToast("Phrase cannot be empty", "error");
      return;
    }

    const isDuplicate = replies.some(
      (r) => r.phrase.toLowerCase() === cleanPhrase.toLowerCase()
    );

    if (isDuplicate) {
      showToast("This quick reply already exists", "error");
      return;
    }

    const newReply = { label: cleanPhrase, phrase: cleanPhrase, category: newCategory };
    setReplies((prev) => [...prev, newReply]);
    setNewPhrase("");
    setNewCategory("General");
    setIsAdding(false);
    showToast("Quick reply added", "success");
  };

  const handleDelete = (phraseToDelete) => {
    setReplies((prev) => prev.filter((r) => r.phrase !== phraseToDelete));
    showToast("Quick reply deleted", "success");
  };

  const filteredReplies = replies.filter((reply) => {
    if (selectedCategoryTab === "All") return true;
    return reply.category === selectedCategoryTab;
  });

  return (
    <section
      aria-labelledby="qr-heading"
      className="flex-shrink-0 border-b border-neutral-200 px-4 py-3 dark:border-border dark:bg-background"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3
          id="qr-heading"
          className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500"
        >
          Quick replies
        </h3>
        <div className="flex items-center gap-3">
          {isEditing && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              aria-label="Add new quick reply"
            >
              <Plus size={12} aria-hidden="true" />
              Add
            </button>
          )}
          <button
            onClick={() => {
              setIsEditing(!isEditing);
              setIsAdding(false);
              setNewPhrase("");
            }}
            className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300 transition-colors"
            aria-label={isEditing ? "Done customizing quick replies" : "Customize quick replies"}
          >
            {isEditing ? "Done" : "Customize"}
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div
        className="mb-3 flex overflow-x-auto gap-1.5 pb-1 no-scrollbar"
        role="tablist"
        aria-label="Quick replies categories"
      >
        {["All", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={selectedCategoryTab === cat}
            onClick={() => setSelectedCategoryTab(cat)}
            className={[
              "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors duration-150 shrink-0",
              selectedCategoryTab === cat
                ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-surface dark:hover:text-neutral-300",
            ].join(" ")}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick reply phrases">
        {filteredReplies.map(({ label, phrase }) => {
          if (isEditing) {
            return (
              <div
                key={phrase}
                className={[
                  "flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 pl-3 pr-2 py-1.5",
                  "text-sm text-neutral-700 dark:border-border dark:bg-surface dark:text-neutral-300",
                ].join(" ")}
              >
                <span className="truncate max-w-[150px]">{label}</span>
                <button
                  onClick={() => handleDelete(phrase)}
                  aria-label={`Delete quick reply: ${phrase}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
            );
          }

          return (
            <button
              key={phrase}
              onClick={() => onSelect(phrase)}
              className={[
                "rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5",
                "text-sm text-neutral-700 transition-all duration-150",
                "hover:-translate-y-px hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700",
                "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1",
                "active:translate-y-0 active:scale-95",
                "dark:border-border dark:bg-surface dark:text-neutral-300",
                "dark:hover:border-blue-500 dark:hover:bg-blue-500/15 dark:hover:text-blue-300 dark:focus:ring-offset-black",
              ].join(" ")}
              aria-label={`Quick reply: ${phrase}`}
            >
              {label}
            </button>
          );
        })}

        {isAdding && (
          <form
            onSubmit={handleAdd}
            className="flex items-center gap-1.5 rounded-full border border-blue-400 bg-white pl-3 pr-2 py-1 dark:border-blue-500 dark:bg-neutral-900"
          >
            <input
              type="text"
              value={newPhrase}
              onChange={(e) => setNewPhrase(e.target.value)}
              maxLength={120}
              placeholder="New reply..."
              autoFocus
              className="flex-1 min-w-[5rem] max-w-[10rem] bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              aria-label="Category"
              className="bg-transparent text-xs text-neutral-500 dark:text-neutral-400 focus:outline-none border-l border-neutral-200 dark:border-neutral-700 pl-1.5 mr-1 cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="dark:bg-neutral-900 dark:text-neutral-100">
                  {cat}
                </option>
              ))}
            </select>
            <button
              type="submit"
              aria-label="Save quick reply"
              className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            >
              <Check size={12} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewPhrase("");
              }}
              aria-label="Cancel"
              className="flex h-5 w-5 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </form>
        )}

        {filteredReplies.length === 0 && !isAdding && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">
            {isEditing
              ? 'No quick replies in this category. Click "Add" to create one.'
              : 'No quick replies in this category.'}
          </p>
        )}
      </div>

      <ToastContainer toasts={toasts} />
    </section>
  );
}

