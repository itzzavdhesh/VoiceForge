// Coordinates top-level navigation, saved voice state, and page rendering for VoiceForge.
import React from "react";
import { Camera, Mic2, Settings as SettingsIcon, MessageSquare, Sun, Moon, Menu, X } from "lucide-react";
import Onboarding from "./pages/Onboarding.jsx";
import Call from "./pages/Call.jsx";
import Settings from "./pages/Settings.jsx";
import VoiceForge from "./components/VoiceForge";
import { useTheme } from "./components/ThemeContext.jsx";
import Footer from './components/Footer.jsx';
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal.jsx";
import ScrollToBottomButton from "./components/ScrollToBottomButton.jsx";

const tabs = [
  { id: "onboarding", label: "Onboarding", icon: Mic2 },
  { id: "call",       label: "Call",         icon: Camera },
  { id: "compose",    label: "Compose",     icon: MessageSquare },
  { id: "settings",   label: "Settings",    icon: SettingsIcon },
];

const DEFAULT_TAB = "onboarding";
const tabIds = new Set(tabs.map((tab) => tab.id));

function getSavedTab() {
  try {
    const saved = localStorage.getItem("voiceforge:activeTab");
    return tabIds.has(saved) ? saved : DEFAULT_TAB;
  } catch {
    return DEFAULT_TAB;
  }
}

function saveActiveTab(tab) {
  try {
    localStorage.setItem("voiceforge:activeTab", tab);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export default function App() {
  const [activeTab, setActiveTab] = React.useState(getSavedTab);
  const { theme, toggleTheme } = useTheme();
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const headerRef = React.useRef(null);

  // Keyboard shortcut to open shortcuts modal
  React.useEffect(() => {
    function handleKeyDown(event) {
      if (
        event.key === "?" &&
        !["INPUT", "TEXTAREA"].includes(event.target.tagName) &&
        !event.target.isContentEditable &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        if (shortcutsOpen) return;
        setShortcutsOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcutsOpen]);

  // Close mobile nav when clicking outside the header
  React.useEffect(() => {
    if (!mobileNavOpen) return;
    function handleClickOutside(event) {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setMobileNavOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileNavOpen]);

  // Auto-close mobile nav when viewport reaches lg breakpoint (1024px)
  React.useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    function handleBreakpoint(e) {
      if (e.matches) setMobileNavOpen(false);
    }
    mql.addEventListener("change", handleBreakpoint);
    return () => mql.removeEventListener("change", handleBreakpoint);
  }, []);

  function selectTab(tab) {
    if (!tabIds.has(tab)) return;
    saveActiveTab(tab);
    setActiveTab(tab);
    setMobileNavOpen(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-cloud text-ink dark:bg-night dark:text-neutral-100">
      
      {/* Global Header */}
      <header ref={headerRef} className="border-b border-ink/10 bg-white dark:border-border dark:bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/models/logo5.png"
              alt="VoiceForge Logo"
              className="h-10 w-10 flex-shrink-0 object-contain sm:h-12 sm:w-12"
            />
            <div className="min-w-0">
              <p className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-moss dark:text-glow sm:block">
                Open source assistive video
              </p>
              <h1 className="text-xl font-bold tracking-normal text-ink dark:text-neutral-50 sm:text-2xl lg:text-3xl">
                VoiceForge
              </h1>
            </div>
          </div>

          {/* Desktop nav + theme toggle */}
          <div className="hidden items-center gap-2 lg:flex">
            <nav className="flex gap-2" aria-label="VoiceForge pages">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => selectTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss dark:focus-visible:ring-glow ${
                      selected
                        ? "border-ink bg-black text-white dark:border-glow dark:bg-glow dark:text-black"
                        : "border-ink/15 bg-white text-ink hover:border-moss hover:text-moss dark:border-border dark:bg-black dark:text-neutral-200 dark:hover:border-glow dark:hover:text-glow"
                    }`}
                  >
                    <Icon aria-hidden="true" size={17} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={toggleTheme}
              aria-pressed={theme === "dark"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-ink/15 bg-white text-ink transition hover:border-moss hover:text-moss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss dark:border-border dark:bg-black dark:text-neutral-200 dark:hover:border-glow dark:hover:text-glow dark:focus-visible:ring-glow"
            >
              {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
          </div>

          {/* Mobile: theme toggle + hamburger */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              aria-pressed={theme === "dark"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink/15 bg-white text-ink transition hover:border-moss dark:border-border dark:bg-black dark:text-neutral-200"
            >
              {theme === "dark" ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink/15 bg-white text-ink transition hover:border-moss dark:border-border dark:bg-black dark:text-neutral-200"
            >
              {mobileNavOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown nav */}
        {mobileNavOpen && (
          <nav
            className="border-t border-ink/10 bg-white px-4 pb-4 pt-2 dark:border-border dark:bg-surface lg:hidden"
            aria-label="VoiceForge pages (mobile)"
          >
            <div className="flex flex-col gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => selectTab(tab.id)}
                    className={`inline-flex w-full items-center gap-3 rounded-md border px-4 py-3 text-sm font-semibold transition ${
                      selected
                        ? "border-ink bg-black text-white dark:border-glow dark:bg-glow dark:text-black"
                        : "border-ink/15 bg-white text-ink hover:border-moss hover:text-moss dark:border-border dark:bg-black dark:text-neutral-200"
                    }`}
                  >
                    <Icon aria-hidden="true" size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        {activeTab === "compose" && <VoiceForge />}

        {activeTab !== "compose" && (
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {activeTab === "onboarding" && <Onboarding onReady={() => selectTab("call")} />}
            {activeTab === "call"       && <Call />}
            {activeTab === "settings"   && <Settings />}
          </div>
        )}
      </main>

      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ScrollToBottomButton activeTab={activeTab} />
      <Footer onNavigate={selectTab} tabs={tabs} />

    </div>
  );
}

