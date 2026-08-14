// Coordinates top-level navigation, saved voice state, and page rendering for VoiceForge.
import React from "react";
import { Camera, Mic2, Settings as SettingsIcon, MessageSquare, Sun, Moon, Menu, X, Info } from "lucide-react";
import Onboarding from "./pages/Onboarding.jsx";
import Call from "./pages/Call.jsx";
import Settings from "./pages/Settings.jsx";
import VoiceForge from "./components/VoiceForge";
import { useTheme } from "./components/ThemeContext.jsx";
import Footer from './components/Footer.jsx';
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal.jsx";
import ScrollToBottomButton from "./components/ScrollToBottomButton.jsx";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound.jsx";

const tabs = [
  { id: "onboarding", label: "Onboarding", icon: Mic2 },
  { id: "call",       label: "Call",         icon: Camera },
  { id: "compose",    label: "Compose",     icon: MessageSquare },
  { id: "about", label: "About", icon: Info },
  { id: "settings",   label: "Settings",    icon: SettingsIcon },
];

const DEFAULT_TAB = "landing";
const tabIds = new Set(tabs.map((tab) => tab.id));

function getSavedTab() {
  try {
    const saved = sessionStorage.getItem("voiceforge:activeTab");
    if (saved === "landing") return saved;
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

// A minimal, self-contained router to avoid adding third-party dependencies.
function Routes({ children }) {
  const [currentPath, setCurrentPath] = React.useState(
    typeof window !== "undefined" ? window.location.pathname : "/"
  );

  React.useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    
    window.addEventListener("popstate", handleLocationChange);
    
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      handleLocationChange();
    };
    
    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      handleLocationChange();
    };

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  let match = null;
  let fallback = null;

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const isMainPath = (child.props.path === "/" && (currentPath === "/" || currentPath === "/index.html"));
    
    if (child.props.path === "*") {
      fallback = child;
    } else if (child.props.path === currentPath || isMainPath) {
      match = child;
    }
  });

  return match || fallback || null;
}

function Route({ element }) {
  return element;
}

export default function App() {
  const [activeTab, setActiveTab] = useState(getSavedTab);
  const { theme, toggleTheme } = useTheme();
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await clearStorage();
    } catch (e) {
      console.error("Failed to clear local IndexedDB on logout:", e);
    }
    const keysToClear = [
      "vf_history",
      "vf_favorites",
      "vf_transcript",
      "vf_analytics_history",
      "voiceforge:activeVoiceId",
      "voiceforge:useClonedVoice",
      "voiceforge:onboardingStep",
      "voiceforge:maxUnlockedStep"
    ];
    keysToClear.forEach(key => localStorage.removeItem(key));
    logout();
  };

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
    if (window.location.pathname !== "/" && window.location.pathname !== "/index.html") {
      window.history.pushState({}, "", "/");
    }
  }

  // Support navigation to non-tab routes such as the privacy policy.
  function navigateTo(route) {
    if (route === "privacy-policy") {
      window.history.pushState({}, "", "/privacy-policy");
      return;
    }

    selectTab(route);
  }

  // Sync tab state with current location path (initial load, browser navigation, or history updates)
  React.useEffect(() => {
    const handleSync = () => {
      const path = window.location.pathname;
      if (path === "/privacy-policy") {
        setActiveTab("privacy-policy");
      } else if (path === "/" || path === "/index.html") {
        const saved = getSavedTab();
        setActiveTab(saved);
      } else {
        setActiveTab("not-found");
      }
    };
    
    handleSync();
    
    window.addEventListener("popstate", handleSync);
    
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      handleSync();
    };
    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      handleSync();
    };
    
    return () => {
      window.removeEventListener("popstate", handleSync);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
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
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink/15 bg-white text-ink transition hover:border-moss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss dark:border-border dark:bg-black dark:text-neutral-200 dark:focus-visible:ring-glow sm:hidden"
          >
            {theme === "dark" ? (
              <Sun size={17} aria-hidden="true" />
            ) : (
              <Moon size={17} aria-hidden="true" />
            )}
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
              aria-label={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-ink/15 bg-white text-ink transition hover:border-moss hover:text-moss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss dark:border-border dark:bg-black dark:text-neutral-200 dark:hover:border-glow dark:hover:text-glow dark:focus-visible:ring-glow"
            >
              {theme === "dark" ? (
                <Sun size={18} aria-hidden="true" />
              ) : (
                <Moon size={18} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        <Routes>
          <Route
            path="/"
            element={
              activeTab === "compose" ? (
                <VoiceForge />
              ) : (
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                  {activeTab === "onboarding" && <Onboarding onReady={() => selectTab("call")} />}
                  {activeTab === "call"       && <Call />}
                  {activeTab === "settings"   && <Settings />}
                  {activeTab === "contributors" && <Contributors />}
                  {activeTab === "about"       && <About onNavigate={selectTab} />}
                </div>
              )
            }
          />
          <Route
            path="/privacy-policy"
            element={
              <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <PrivacyPolicy onBackHome={() => selectTab("onboarding")} />
              </div>
            }
          />
          <Route
            path="*"
            element={<NotFound onBackHome={() => selectTab("onboarding")} />}
          />
        </Routes>
      </main>

      <Footer />
    </main>
  );
}
