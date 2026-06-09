// Modal displaying all keyboard shortcuts available in VoiceForge.
import React from "react";
import { X, Keyboard } from "lucide-react";

const SHORTCUTS = [
  {
    context: "Call page",
    shortcuts: [
      { keys: ["Enter"], description: "Speak typed text" },
      { keys: ["Shift", "Enter"], description: "Add a new line" },
    ],
  },
  {
    context: "Compose",
    shortcuts: [
      { keys: ["Ctrl", "Enter"], description: "Speak typed text" },
    ],
  },
  {
    context: "Speech History",
    shortcuts: [
      { keys: ["←", "→"], description: "Switch between All and Pinned tabs" },
    ],
  },
  {
    context: "Global",
    shortcuts: [
      { keys: ["?"], description: "Open this shortcuts modal" },
      { keys: ["Esc"], description: "Close this modal" },
    ],
  },
];

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  const modalRef = React.useRef(null);

React.useEffect(() => {
  if (!isOpen) return;

  const focusableSelectors = [
    'button', '[href]', 'input', 'select', 'textarea',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      onClose();
      return;
    }
    if (event.key === "Tab" && modalRef.current) {
      const focusable = Array.from(modalRef.current.querySelectorAll(focusableSelectors));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  }

  window.addEventListener("keydown", handleKeyDown);

  // Move focus into modal on open
  modalRef.current?.focus();

  return () => window.removeEventListener("keydown", handleKeyDown);
}, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div ref={modalRef} tabIndex={-1} className="relative w-full max-w-md rounded-xl border border-ink/10 bg-white shadow-lg dark:border-border dark:bg-surface outline-none">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4 dark:border-border">
          <div className="flex items-center gap-2">
            <Keyboard size={18} aria-hidden="true" className="text-ink dark:text-neutral-200" />
            <h2 className="text-base font-semibold text-ink dark:text-neutral-100">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts modal"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink/50 transition hover:bg-ink/5 hover:text-ink dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-100"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="divide-y divide-ink/5 px-6 py-2 dark:divide-border">
          {SHORTCUTS.map((group) => (
            <div key={group.context} className="py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink/40 dark:text-neutral-500">
                {group.context}
              </p>
              <div className="flex flex-col gap-2">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.description} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-ink/70 dark:text-neutral-300">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className="rounded border border-ink/15 bg-ink/5 px-2 py-0.5 font-mono text-xs text-ink dark:border-border dark:bg-white/5 dark:text-neutral-200"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="border-t border-ink/10 px-6 py-3 dark:border-border flex items-center justify-between">
          <p className="text-xs text-ink/40 dark:text-neutral-500">
            Press <kbd className="rounded border border-ink/15 bg-ink/5 px-1 font-mono text-[10px] dark:border-border dark:bg-white/5">?</kbd> anywhere to open
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-ink/50 hover:text-ink dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors duration-150"
          >
            Close
          </button>
        </div> 

      </div>
    </div>
  );
}
