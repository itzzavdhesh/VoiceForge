import React, {
  useCallback,
  useRef,
  useState,
  useEffect,
} from "react";
import { Copy, Eraser, Mic2, History, X } from "lucide-react";
import { VoiceQuickSettings } from "./VoiceQuickSettings";
import { FavoriteMessages } from "./FavoriteMessages";
import { QuickReplies } from "./QuickReplies";
import { SpeechHistory } from "./SpeechHistory";
import { ToastContainer, useToast } from "./useToast.jsx";
import { useSpeechHistory } from "../hooks/useSpeechHistory";

const MAX_CHARS = 500;

export default function VoiceForge() {
  const [inputText, setInputText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem("voiceforge:compose-language") || "en");
  const [historyOpen, setHistoryOpen] = useState(false);
  const drawerRef = useRef(null);

  const [announcement, setAnnouncement] = useState("");
  const textareaRef = useRef(null);

  const {
    history,
    favorites,
    addMessage,
    removeMessage,
    toggleFavorite,
    clearHistory,
  } = useSpeechHistory();

  const { toasts, showToast } = useToast();

  const speak = useCallback((text) => {
    if (!text.trim()) return;

    if (!("speechSynthesis" in window)) {
      showToast("Speech synthesis is not supported in this browser", "error");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      showToast("Speech playback failed", "error");
    };
    window.speechSynthesis.speak(utterance);
  }, [showToast, language]);

  const handleSpeak = useCallback(() => {
    const text = inputText.trim();
    if (!text) {
      showToast("Please type a message first", "error");
      textareaRef.current?.focus();
      return;
    }
    speak(text);
    addMessage(text);
    showToast("Saved to history", "success");
  }, [inputText, speak, addMessage, showToast]);

  const handleReplay = useCallback((text) => {
    speak(text);
    showToast("Replaying...", "info");
  }, [speak, showToast]);

  const handleReuse = useCallback((text) => {
    setInputText(text);
    textareaRef.current?.focus();
    showToast("Loaded into composer", "success");
  }, [showToast]);

  const handleCopy = useCallback((text) => {
    const target = text || inputText;
    if (!target.trim()) {
      showToast("Nothing to copy", "error");
      return;
    }

    navigator.clipboard
      .writeText(target)
      .then(() => showToast("Copied to clipboard", "success"))
      .catch(() => {
        const ta = document.createElement("textarea");
        ta.value = target;
        ta.style.position = "absolute";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showToast("Copied", "success");
      });
  }, [inputText, showToast]);

  const handleQuickReply = useCallback((phrase) => {
    setInputText(phrase);
    textareaRef.current?.focus();
    showToast("Quick reply loaded", "success");
  }, [showToast]);

  const handleKeyDown = useCallback((event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      handleSpeak();
    }
  }, [handleSpeak]);

  const charsLeft = MAX_CHARS - inputText.length;

  
  const hasAnnouncedRef = useRef(false);

  // Move focus into the history drawer when it opens (a11y)
  useEffect(() => {
    if (historyOpen && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [historyOpen]);

  useEffect(() => {
    if (charsLeft < 50 && !hasAnnouncedRef.current) {
      hasAnnouncedRef.current = true;
      setAnnouncement(`Warning: only ${charsLeft} characters remaining.`);
    } else if (charsLeft >= 50) {
      hasAnnouncedRef.current = false;
      setAnnouncement("");
    }
  }, [charsLeft]);
  useEffect(() => {
    localStorage.setItem("voiceforge:compose-language", language);
  }, [language]);

  function getCounterColor() {
    if (charsLeft < 50)  return "text-red-500";
    if (charsLeft < 100) return "text-orange-500";
    if (charsLeft < 200) return "text-yellow-500";
    return "text-neutral-400 dark:text-neutral-500";
  }

  function getTextareaBorder() {
    if (charsLeft < 50)  return "border-red-300 dark:border-red-800";
    if (charsLeft < 100) return "border-orange-300 dark:border-orange-800";
    if (charsLeft < 200) return "border-yellow-300 dark:border-yellow-800";
    return "border-neutral-200 dark:border-border";
  }

  return (
    <div className="relative flex h-[calc(100vh-57px)] overflow-hidden bg-white font-sans antialiased dark:bg-black sm:h-[calc(100vh-65px)]">
      {/* Mobile history drawer overlay */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setHistoryOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: always visible on lg+, drawer on mobile */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal={historyOpen}
        aria-label="Speech history"
        className={[
          "absolute inset-y-0 left-0 z-30 flex flex-col transition-transform duration-200 focus:outline-none",
          "lg:static lg:z-auto lg:translate-x-0 lg:flex",
          historyOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <SpeechHistory
          history={history}
          favorites={favorites}
          onReuse={(text) => { handleReuse(text); setHistoryOpen(false); }}
          onReplay={handleReplay}
          onToggleFav={toggleFavorite}
          onDelete={removeMessage}
          onClearHistory={clearHistory}
          onCopy={handleCopy}
        />
      </div>

      <main className="flex flex-1 flex-col overflow-hidden" aria-label="Speech composer">
        <header className="flex flex-shrink-0 items-center gap-2 border-b border-neutral-200 px-4 py-3 dark:border-border dark:bg-black sm:px-5 sm:py-3.5">
          {/* Mobile: history toggle */}
          <button
            className="mr-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-neutral-200 text-neutral-500 transition hover:bg-neutral-100 lg:hidden dark:border-border dark:text-neutral-400"
            onClick={() => setHistoryOpen((o) => !o)}
            aria-label={historyOpen ? "Close history" : "Open history"}
          >
            {historyOpen ? <X size={15} aria-hidden="true" /> : <History size={15} aria-hidden="true" />}
          </button>
          <h1 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
            VoiceForge
          </h1>
          <span className="text-xs text-neutral-400 dark:text-neutral-500 sm:text-sm">
            Speech Composer
          </span>
          {isSpeaking && (
            <span
              className="ml-auto flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
              aria-live="polite"
              role="status"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>
              Speaking...
            </span>
          )}
        </header>

        <FavoriteMessages
          history={history}
          favorites={favorites}
          onReuse={handleReuse}
          onUnpin={toggleFavorite}
        />

        <QuickReplies onSelect={handleQuickReply} />

        <div className="flex flex-1 flex-col gap-3 overflow-auto p-5 dark:bg-black">
          <div className="flex items-center justify-between">
            <label
              htmlFor="vf-compose"
              className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500"
            >
              Compose message
            </label>
            <span
              className={[
                "text-xs tabular-nums",
                getCounterColor(),
              ].join(" ")}
              aria-live="polite"
            >
              {inputText.length} / {MAX_CHARS}
            </span>
            <div className="sr-only" aria-live="assertive" aria-atomic="true">
              {announcement}
            </div>
          </div>

          <textarea
            id="vf-compose"
            ref={textareaRef}
            value={inputText}
            onChange={(event) => setInputText(event.target.value.slice(0, MAX_CHARS))}
            onKeyDown={handleKeyDown}
            placeholder="Type your message or select a quick reply..."
            maxLength={MAX_CHARS}
            aria-label="Message to speak"
            aria-describedby="vf-hint"
            className={[
              "flex-1 resize-none rounded-lg border bg-neutral-50 px-4 py-3",
              "text-sm leading-relaxed text-neutral-800 placeholder:text-neutral-400",
              "transition-colors duration-150 dark:bg-black dark:text-neutral-100",
              "dark:placeholder:text-neutral-600",
              "focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200",
              "dark:focus:bg-black dark:focus:ring-blue-500/30",
              getTextareaBorder(),
            ].join(" ")}
            rows={6}
          />

          <p id="vf-hint" className="text-xs text-neutral-400 dark:text-neutral-600">
            Tip: Press <kbd className="rounded border border-neutral-200 px-1 font-mono text-[10px] dark:border-border">Ctrl</kbd> +{" "}
            <kbd className="rounded border border-neutral-200 px-1 font-mono text-[10px] dark:border-border">Enter</kbd> to speak quickly.
          </p>

          <VoiceQuickSettings />

          <div className="flex items-center gap-2">
            <label htmlFor="vf-language" className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Language:</label>
            <select
              id="vf-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:border-border dark:bg-black dark:text-neutral-100"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
              <option value="ja">Japanese</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleCopy(inputText)}
              disabled={!inputText.trim()}
              aria-label="Copy message to clipboard"
              className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-600 transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:text-neutral-300 dark:hover:bg-surface"
            >
              <Copy size={15} aria-hidden="true" />
              Copy
            </button>

            <button
              onClick={() => setInputText("")}
              disabled={!inputText}
              aria-label="Clear compose area"
              className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-600 transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:text-neutral-300 dark:hover:bg-surface"
            >
              <Eraser size={15} aria-hidden="true" />
              Clear
            </button>

            <button
              onClick={handleSpeak}
              disabled={!inputText.trim() || isSpeaking}
              aria-label={isSpeaking ? "Currently speaking" : "Speak and save to history"}
              className={[
                "ml-auto flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition",
                "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 dark:focus:ring-offset-black",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isSpeaking ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]",
              ].join(" ")}
            >
              <Mic2 size={16} aria-hidden="true" />
              {isSpeaking ? "Speaking..." : "Speak & Save"}
            </button>
          </div>
        </div>
      </main>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
