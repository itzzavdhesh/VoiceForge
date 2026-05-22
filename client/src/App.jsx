// Coordinates top-level navigation, saved voice state, and page rendering for VoiceForge.
import React from "react";
import { Camera, Mic2, Settings as SettingsIcon } from "lucide-react";
import Onboarding from "./pages/Onboarding.jsx";
import Call from "./pages/Call.jsx";
import Settings from "./pages/Settings.jsx";

const tabs = [
  { id: "onboarding", label: "Onboarding", icon: Mic2 },
  { id: "call", label: "Call", icon: Camera },
  { id: "settings", label: "Settings", icon: SettingsIcon }
];

export default function App() {
  const initialTab = localStorage.getItem("voiceforge:activeTab") || "onboarding";
  const [activeTab, setActiveTab] = React.useState(initialTab);

  function selectTab(tab) {
    localStorage.setItem("voiceforge:activeTab", tab);
    setActiveTab(tab);
  }

  return (
    <main className="min-h-screen bg-cloud text-ink">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Open source assistive video</p>
            <h1 className="mt-1 text-3xl font-bold tracking-normal text-ink">VoiceForge</h1>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="VoiceForge pages">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition ${
                    selected
                      ? "border-ink bg-ink text-white"
                      : "border-ink/15 bg-white text-ink hover:border-moss hover:text-moss"
                  }`}
                >
                  <Icon aria-hidden="true" size={17} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === "onboarding" && <Onboarding onReady={() => selectTab("call")} />}
        {activeTab === "call" && <Call />}
        {activeTab === "settings" && <Settings />}
      </div>
    </main>
  );
}
