// Coordinates top-level navigation, saved voice state, and page rendering for VoiceForge.
import React from "react";
import { Camera, Mic2, Settings as SettingsIcon, MessageSquare, Sun, Moon, Menu, X, Users, Info } from "lucide-react";
import Onboarding from "./pages/Onboarding.jsx";
import Call from "./pages/Call.jsx";
import Settings from "./pages/Settings.jsx";
import VoiceForge from "./components/VoiceForge";
import { useTheme } from "./components/ThemeContext.jsx";
import Footer from './components/Footer.jsx';
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal.jsx";
import ScrollToBottomButton from "./components/ScrollToBottomButton.jsx";
import ScrollToTopButton from "./components/ScrollToTopButton";
import Contributors from "./pages/Contributors.jsx";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";

const tabs = [
  { id: "onboarding",   label: "Onboarding",   icon: Mic2 },
  { id: "call",         label: "Call",          icon: Camera },
  { id: "compose",      label: "Compose",       icon: MessageSquare },
  { id: "settings",     label: "Settings",      icon: SettingsIcon },
  { id: "contributors", label: "Contributors",  icon: Users },
  { id: "about", label: "About", icon: Info },
];

const DEFAULT_TAB = "onboarding";
const tabIds = new Set(tabs.map((tab) => tab.id));

// We intentionally use sessionStorage (not localStorage) here so that the
// active tab is only remembered for the lifetime of the current browser tab.
// This keeps in-session navigation (e.g. refreshing while on Compose) smooth,
// while making it much more likely that a fresh visit (a new tab/window
// opened independently, or reopening after the browser was fully closed)
// lands back on Onboarding. Note: this isn't an absolute guarantee in every
// browser/scenario (e.g. sessionStorage is inherited when a tab is opened
// via window.open from an existing VoiceForge tab, and some browsers'
// session-restore features can preserve it across restarts), but it's a
// meaningful improvement over localStorage, which persisted indefinitely.
function getSavedTab() {
  try {
    const saved = sessionStorage.getItem("voiceforge:activeTab");
    return tabIds.has(saved) ? saved : DEFAULT_TAB;
  } catch {
    return DEFAULT_TAB;
  }
}

function saveActiveTab(tab) {
  try {
    sessionStorage.setItem("voiceforge:activeTab", tab);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export default function App() {
  const [activeTab, setActiveTab] = React.useState(getSavedTab);
  const { theme, toggleTheme } = useTheme();
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);

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



  function selectTab(tab) {
    if (!tabIds.has(tab)) return;
    saveActiveTab(tab);
    setActiveTab(tab);
  }

  // Support navigation to non-tab routes such as the privacy policy.
  function navigateTo(route) {
    if (route === "privacy-policy") {
      setActiveTab("privacy-policy");
      return;
    }
    selectTab(route);
  }

  // On initial load, honor direct links to /privacy-policy
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.location?.pathname === "/privacy-policy") {
        setActiveTab("privacy-policy");
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-cloud text-ink dark:bg-night dark:text-neutral-100">
      
      {/* Global Header */}
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/70 backdrop-blur-md dark:border-border dark:bg-surface/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo + Title */}
            <div
              className="flex items-center gap-3 min-w-0 cursor-pointer"
              onClick={() => selectTab("onboarding")}
              role="button"
              tabIndex={0}
              aria-label="Go to home"
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && selectTab("onboarding")}
            >
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

          {/* Mobile: theme toggle only */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={theme === "dark"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink/15 bg-white text-ink transition hover:border-moss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss dark:border-border dark:bg-black dark:text-neutral-200 dark:focus-visible:ring-glow sm:hidden"
          >
            {theme === "dark" ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          </button>

          {/* Desktop nav + theme toggle */}
          <div className="hidden items-center gap-2 sm:flex">
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

        </div>

      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        {activeTab === "compose" && <VoiceForge />}

        {activeTab !== "compose" && (
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {activeTab === "onboarding" && <Onboarding onReady={() => selectTab("call")} />}
            {activeTab === "call"       && <Call />}
            {activeTab === "settings"   && <Settings />}
            {activeTab === "contributors" && <Contributors />}
            {activeTab === "about" && <About onNavigate={selectTab} />}
            {activeTab === "privacy-policy" && (<PrivacyPolicy
              onBackHome={() => selectTab("onboarding")}
             />
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-ink/10 bg-white pb-safe sm:hidden dark:border-border dark:bg-surface"
        aria-label="VoiceForge mobile navigation"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              aria-current={selected ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 px-2 py-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss dark:focus-visible:ring-glow ${
                selected
                  ? "text-moss dark:text-glow"
                  : "text-ink/50 hover:text-ink dark:text-neutral-500 dark:hover:text-neutral-200"
              }`}
            >
              <Icon size={22} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom padding so content isn't hidden behind bottom nav on mobile */}
      <div className="h-16 sm:hidden" aria-hidden="true" />
      
      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ScrollToBottomButton activeTab={activeTab} />
      <ScrollToTopButton activeTab={activeTab} />
      <Footer onNavigate={navigateTo} tabs={tabs} onOpenShortcuts={() => setShortcutsOpen(true)} />
    </div>
  );
}
