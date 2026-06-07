// Coordinates top-level navigation, saved voice state, and page rendering for VoiceForge.
import React from "react";
import { Camera, Mic2, Settings as SettingsIcon, MessageSquare, Sun, Moon } from "lucide-react";
import Onboarding from "./pages/Onboarding.jsx";
import Call from "./pages/Call.jsx";
import Settings from "./pages/Settings.jsx";
import VoiceForge from "./components/VoiceForge";
import { useTheme } from "./components/ThemeContext.jsx";
import Footer from './components/Footer.jsx';

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

  function selectTab(tab) {
    if (!tabIds.has(tab)) return;
    saveActiveTab(tab);
    setActiveTab(tab);
  }

  return (
    <div className="min-h-screen flex flex-col bg-cloud text-ink dark:bg-night dark:text-neutral-100">
      
      {/* Global Header */}
      <header className="border-b border-ink/10 bg-white dark:border-border dark:bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-4">
            <img
              src="/models/logo5.png"
              alt="VoiceForge Logo"
              className="h-14 w-14 object-contain"
            />

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss dark:text-glow">
               Open source assistive video
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-normal text-ink dark:text-neutral-50">
               VoiceForge
              </h1>
            </div>
         </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex flex-wrap gap-2" aria-label="VoiceForge pages">
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

            {/* Dark / Light mode toggle */}
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
          </div>
        )}
      </main>

      
      <Footer />
    </div>
  );
}

