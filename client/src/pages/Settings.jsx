// Lets users manage browser-stored voice profiles and configure voice synthesis settings.
import React from "react";
import {
  DEFAULT_VOICE_SETTINGS,
  loadVoiceSettings,
  persistVoiceSettings,
  VOICE_PRESETS,
} from "../utils/voiceSettings.js";
import {
  loadLanguage,
  persistLanguage,
  getLanguageByCode,
  LANGUAGE_STORAGE_KEY,
} from "../utils/languages.js";

import { Trash2, CircleAlert, Download, Upload, Globe } from "lucide-react";
import { useToast, ToastContainer } from "../components/useToast.jsx";
import { LanguageSelector } from "../components/LanguageSelector.jsx";
import {
  deleteVoiceProfile,
  getSavedProfiles,
  clearAllVoiceProfiles,
} from "../hooks/useVoiceClone.js";
import { saveProfile } from "../utils/db.js";
import { ProfileCard } from "../components/ProfileCard.jsx";
import { ShareProfileModal } from "../components/ShareProfileModal.jsx";
import { ReceiveProfileModal } from "../components/ReceiveProfileModal.jsx";

function AudioPlayback({ blob }) {
  const [audioUrl, setAudioUrl] = React.useState(null);

  React.useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  if (!audioUrl) return null;
  return (
    <audio
      src={audioUrl}
      controls
      className="mt-2 h-8 w-full max-w-xs"
    />
  );
}

export default function Settings() {
  const [profiles, setProfiles] = React.useState([]);
  const [dbError, setDbError] = React.useState("");
  const [sharingProfile, setSharingProfile] = React.useState(null);
  const [isReceiving, setIsReceiving] = React.useState(false);
  const { toasts, showToast } = useToast();
  React.useEffect(() => {
    async function loadProfiles() {
      try {
        const loaded = await getSavedProfiles();
        setProfiles(loaded);
        setDbError("");
      } catch (err) {
        setDbError(err?.message || String(err));
      }
    }
    loadProfiles();
  }, []);


  const defaultSettings = DEFAULT_VOICE_SETTINGS;
  const [voiceSettings, setVoiceSettings] = React.useState(loadVoiceSettings);
  const [language, setLanguage] = React.useState(loadLanguage);
  const selectedLangObj = getLanguageByCode(language);


  function saveVoiceSettings(newSettings) {
    setVoiceSettings(newSettings);
    persistVoiceSettings(newSettings);
    window.dispatchEvent(new Event("voiceforge:settingsChanged"));
  }

  const currentPresetKey = React.useMemo(() => {
    const presetEntry = Object.entries(VOICE_PRESETS).find(([_, preset]) => {
      return (
        Math.abs(voiceSettings.stability - preset.stability) < 0.001 &&
        Math.abs(voiceSettings.temperature - preset.temperature) < 0.001 &&
        Math.abs(voiceSettings.style - preset.style) < 0.001 &&
        Math.abs(voiceSettings.dspPitch - preset.dspPitch) < 0.001 &&
        Math.abs(voiceSettings.dspSpeed - preset.dspSpeed) < 0.001 &&
        Math.abs(voiceSettings.dspBass - preset.dspBass) < 0.001 &&
        Math.abs(voiceSettings.dspMid - preset.dspMid) < 0.001 &&
        Math.abs(voiceSettings.dspTreble - preset.dspTreble) < 0.001
      );
    });
    return presetEntry ? presetEntry[0] : "custom";
  }, [voiceSettings]);

  function handlePresetChange(presetKey) {
    if (presetKey === "custom") return;
    const preset = VOICE_PRESETS[presetKey];
    if (preset) {
      saveVoiceSettings({
        ...voiceSettings,
        stability: preset.stability,
        temperature: preset.temperature,
        style: preset.style,
        dspPitch: preset.dspPitch,
        dspSpeed: preset.dspSpeed,
        dspBass: preset.dspBass,
        dspMid: preset.dspMid,
        dspTreble: preset.dspTreble,
      });
    }
  }

  const handleExport = async () => {
    try {
      const storageData = {
        history: localStorage.getItem("vf_history"),
        favorites: localStorage.getItem("vf_favorites"),
        quick_replies: localStorage.getItem("vf_quick_replies"),
        voiceSettings: localStorage.getItem("voiceforge:voiceSettings"),
        language: localStorage.getItem(LANGUAGE_STORAGE_KEY),
        calibrationXOffset: localStorage.getItem("voiceforge:calibrationXOffset"),
        calibrationYOffset: localStorage.getItem("voiceforge:calibrationYOffset"),
        calibrationScale: localStorage.getItem("voiceforge:calibrationScale"),
      };

      const rawProfiles = await getSavedProfiles();
      const profilesData = await Promise.all(
        rawProfiles.map(async (p) => {
          let base64Audio = null;
          if (p.audioBlob) {
            base64Audio = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(p.audioBlob);
            });
          }
          return {
            voice_id: p.voice_id,
            name: p.name,
            createdAt: p.createdAt,
            audioDataUrl: base64Audio,
          };
        })
      );

      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        storage: storageData,
        profiles: profilesData,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `voiceforge-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Data exported successfully", "success");
    } catch (err) {
      showToast("Export failed: " + (err.message || String(err)), "error");
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // 1. File size check (15MB limit to prevent browser freezing)
      const MAX_FILE_SIZE = 15 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("File is too large. Maximum size allowed is 15MB.");
      }

      // 2. Overwrite confirmation
      const confirmOverwrite = window.confirm(
        "Importing this backup will overwrite your current settings, speech history, and voice profiles. Do you want to continue?"
      );
      if (!confirmOverwrite) {
        event.target.value = "";
        return;
      }

      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup || backup.version !== 1 || !backup.storage || !Array.isArray(backup.profiles)) {
        throw new Error("Invalid backup file format.");
      }

      const { storage, profiles: importedProfiles } = backup;

      // 3. Process voice profiles first - if any fail, we don't modify localStorage
      const profilesToSave = [];
      for (const p of importedProfiles) {
        let audioBlob = null;
        if (p.audioDataUrl) {
          try {
            if (typeof p.audioDataUrl === "string" && p.audioDataUrl.startsWith("data:audio/")) {
              const res = await fetch(p.audioDataUrl);
              audioBlob = await res.blob();
            } else {
              console.warn("Skipped invalid or non-audio DataURL in voice profile backup:", p.name);
            }
          } catch (e) {
            console.error("Failed to parse audio DataURL:", e);
          }
        }

        profilesToSave.push({
          id: p.voice_id,
          voice_id: p.voice_id,
          name: p.name,
          createdAt: p.createdAt || new Date().toISOString(),
          audioBlob,
        });
      }

      // Commit profiles to IndexedDB
      for (const profileData of profilesToSave) {
        await saveProfile(profileData);
      }

      // 4. Update localStorage keys (faithfully reproducing empty/null values)
      const keysMap = {
        history: "vf_history",
        favorites: "vf_favorites",
        quick_replies: "vf_quick_replies",
        voiceSettings: "voiceforge:voiceSettings",
        language: LANGUAGE_STORAGE_KEY,
        calibrationXOffset: "voiceforge:calibrationXOffset",
        calibrationYOffset: "voiceforge:calibrationYOffset",
        calibrationScale: "voiceforge:calibrationScale",
      };

      for (const [backupKey, storageKey] of Object.entries(keysMap)) {
        if (backupKey in storage) {
          const val = storage[backupKey];
          if (val === null || val === undefined) {
            localStorage.removeItem(storageKey);
          } else {
            localStorage.setItem(storageKey, val);
          }
        }
      }

      showToast("Data imported successfully", "success");
      const loaded = await getSavedProfiles();
      setProfiles(loaded);
      setVoiceSettings(loadVoiceSettings());
      setLanguage(loadLanguage());
      event.target.value = "";
    } catch (err) {
      showToast("Import failed: " + (err.message || String(err)), "error");
      event.target.value = "";
    }
  };

  async function removeProfile(voiceId) {
    try {
      const next = await deleteVoiceProfile(voiceId);
      setProfiles(next);
      setDbError("");
      showToast("Voice profile deleted", "success");
    } catch (err) {
      setDbError(err?.message || String(err));
      showToast("Failed to delete profile", "error");
    }
  }

  async function removeAllProfiles() {
    const confirmOverwrite = window.confirm("Are you sure you want to delete all saved voice profiles? This action cannot be undone and will free up storage space.");
    if (!confirmOverwrite) return;
    
    try {
      const next = await clearAllVoiceProfiles();
      setProfiles(next);
      setDbError("");
      showToast("All voice profiles deleted", "success");
    } catch (err) {
      setDbError(err?.message || String(err));
      showToast("Failed to clear profiles", "error");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-black p-6 text-white shadow-soft dark:border dark:border-border dark:bg-surface dark:shadow-soft-dk">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-mint">
          Step 3 of 3
        </p>
        <h2 className="mt-2 text-3xl font-bold">Settings</h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-white/75">
          Manage voice profiles saved in this browser.
        </p>
      </section>
      {dbError && (
      <div className="flex items-center gap-2 rounded-md border border-coral/40 bg-coral/10 p-4 text-sm font-semibold text-ink">
        <CircleAlert size={18} aria-hidden="true" />
        <span>Database error: {dbError}</span>
      </div>
    )}

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk">
        <h2 className="text-xl font-bold">Voice Synthesis Settings</h2>
        <p className="mt-1 text-sm text-ink/65 mb-5">Adjust how Chatterbox generates your cloned speech.</p>
        
        <div className="mb-5">
          <label htmlFor="voice-preset" className="mb-2 block text-sm font-bold text-ink dark:text-neutral-200">
            Voice Preset
          </label>
          <select
            id="voice-preset"
            value={currentPresetKey}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-moss/40 dark:border-border dark:bg-black dark:text-neutral-200 dark:focus:ring-glow/40"
          >
            <option value="custom" disabled>Custom</option>
            {Object.entries(VOICE_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          <div>
            <label className="flex justify-between text-sm font-bold" htmlFor="stability">
              <span>Stability</span>
              <span className="text-ink/65">{voiceSettings.stability}</span>
            </label>
            <input
              id="stability"
              type="range"
              min="0" max="1" step="0.01"
              value={voiceSettings.stability}
              onChange={(e) => saveVoiceSettings({ ...voiceSettings, stability: parseFloat(e.target.value) })}
              className="w-full mt-2"
            />
            <p className="text-xs text-ink/50 mt-1">Lower values are more expressive; higher values are more consistent.</p>
          </div>
          
          <div>
            <label className="flex justify-between text-sm font-bold" htmlFor="temperature">
              <span>Temperature</span>
              <span className="text-ink/65">{voiceSettings.temperature}</span>
            </label>
            <input
              id="temperature"
              type="range"
              min="0" max="1" step="0.01"
              value={voiceSettings.temperature}
              onChange={(e) => saveVoiceSettings({ ...voiceSettings, temperature: parseFloat(e.target.value) })}
              className="w-full mt-2"
            />
            <p className="text-xs text-ink/50 mt-1">Lower values are steadier; higher values allow more variation.</p>
          </div>

          <div>
            <label className="flex justify-between text-sm font-bold" htmlFor="style">
              <span>Style Exaggeration</span>
              <span className="text-ink/65">{voiceSettings.style}</span>
            </label>
            <input
              id="style"
              type="range"
              min="0" max="1" step="0.01"
              value={voiceSettings.style}
              onChange={(e) => saveVoiceSettings({ ...voiceSettings, style: parseFloat(e.target.value) })}
              className="w-full mt-2"
            />
            <p className="text-xs text-ink/50 mt-1">Higher values exaggerate the style of the reference audio.</p>
          </div>

          <hr className="border-ink/10 dark:border-border my-4" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-moss dark:text-glow mb-3">Real-time Voice Modifiers (DSP)</h3>

          <div>
            <label className="flex justify-between text-sm font-bold" htmlFor="dsp-pitch">
              <span>Voice Pitch</span>
              <span className="text-ink/65">{voiceSettings.dspPitch}x</span>
            </label>
            <input
              id="dsp-pitch"
              type="range"
              min="0.5" max="1.5" step="0.05"
              value={voiceSettings.dspPitch}
              onChange={(e) => saveVoiceSettings({ ...voiceSettings, dspPitch: parseFloat(e.target.value) })}
              className="w-full mt-2"
            />
            <p className="text-xs text-ink/50 mt-1">Pitch transposition. Lower → deeper voice; higher → higher voice.</p>
          </div>

          <div>
            <label className="flex justify-between text-sm font-bold" htmlFor="dsp-speed">
              <span>Speech Pace (Speed)</span>
              <span className="text-ink/65">{voiceSettings.dspSpeed}x</span>
            </label>
            <input
              id="dsp-speed"
              type="range"
              min="0.5" max="2.0" step="0.05"
              value={voiceSettings.dspSpeed}
              onChange={(e) => saveVoiceSettings({ ...voiceSettings, dspSpeed: parseFloat(e.target.value) })}
              className="w-full mt-2"
            />
            <p className="text-xs text-ink/50 mt-1">Adjust speech speed. Lower → slower; higher → faster speech.</p>
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">3-Band Graphic Equalizer</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="flex justify-between text-xs font-bold" htmlFor="dsp-bass">
                  <span>Bass (200 Hz)</span>
                  <span className="text-ink/65">{voiceSettings.dspBass} dB</span>
                </label>
                <input
                  id="dsp-bass"
                  type="range"
                  min="-10" max="10" step="1"
                  value={voiceSettings.dspBass}
                  onChange={(e) => saveVoiceSettings({ ...voiceSettings, dspBass: parseInt(e.target.value) })}
                  className="w-full mt-1.5"
                />
              </div>

              <div>
                <label className="flex justify-between text-xs font-bold" htmlFor="dsp-mid">
                  <span>Mid (1000 Hz)</span>
                  <span className="text-ink/65">{voiceSettings.dspMid} dB</span>
                </label>
                <input
                  id="dsp-mid"
                  type="range"
                  min="-10" max="10" step="1"
                  value={voiceSettings.dspMid}
                  onChange={(e) => saveVoiceSettings({ ...voiceSettings, dspMid: parseInt(e.target.value) })}
                  className="w-full mt-1.5"
                />
              </div>

              <div>
                <label className="flex justify-between text-xs font-bold" htmlFor="dsp-treble">
                  <span>Treble (4000 Hz)</span>
                  <span className="text-ink/65">{voiceSettings.dspTreble} dB</span>
                </label>
                <input
                  id="dsp-treble"
                  type="range"
                  min="-10" max="10" step="1"
                  value={voiceSettings.dspTreble}
                  onChange={(e) => saveVoiceSettings({ ...voiceSettings, dspTreble: parseInt(e.target.value) })}
                  className="w-full mt-1.5"
                />
              </div>
            </div>
            <p className="text-xs text-ink/50 mt-2">Sculpt voice tone in real-time. Bass controls depth; mid controls presence; treble controls clarity.</p>
          </div>
        </div>
      </section>

      {/* ── Language & Region ─────────────────────────────────────────── */}
      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={20} aria-hidden="true" className="text-moss dark:text-glow" />
          <h2 className="text-xl font-bold">Language &amp; Region</h2>
        </div>
        <p className="mt-1 text-sm text-ink/65 mb-5 dark:text-muted">
          Choose the default output language for Chatterbox voice synthesis.
          This applies across the Call and Compose pages.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="settings-language"
              className="mb-2 block text-sm font-bold text-ink dark:text-neutral-200"
            >
              Default Language
            </label>
            <LanguageSelector
              id="settings-language"
              value={language}
              onChange={(code) => {
                setLanguage(code);
                persistLanguage(code);
                showToast(
                  code
                    ? `Language set to ${getLanguageByCode(code)?.name || code}`
                    : "Language set to Auto-detect",
                  "success"
                );
              }}
            />
          </div>
          {selectedLangObj && (
            <div className="flex items-center gap-2 rounded-lg border border-ink/10 px-4 py-3 dark:border-border">
              <span className="text-2xl" aria-hidden="true">{selectedLangObj.flag}</span>
              <div>
                <p className="text-sm font-bold text-ink dark:text-neutral-200">
                  {selectedLangObj.name}
                </p>
                <p className="text-xs text-ink/55 dark:text-muted">
                  {selectedLangObj.nativeName} · <code className="font-mono">{selectedLangObj.code}</code>
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-ink/50 dark:text-muted">
          Powered by Chatterbox Multilingual TTS - supports 23 languages.
          Choose &ldquo;Auto-detect&rdquo; to let the AI infer the language from your text.
        </p>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk">
        <h2 className="text-xl font-bold">Backup & Restore</h2>
        <p className="mt-1 text-sm text-ink/65 mb-5 dark:text-muted">
          Save your speech history, custom quick replies, and calibration settings to a file, or restore them.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-moss px-5 font-bold text-white transition hover:bg-moss/90"
          >
            <Download size={18} aria-hidden="true" />
            Export Configuration
          </button>

          <label
            htmlFor="import-config-file"
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-5 font-bold text-ink hover:border-moss hover:text-moss dark:border-border dark:bg-black dark:text-neutral-200 dark:hover:border-glow dark:hover:text-glow"
          >
            <Upload size={18} aria-hidden="true" />
            Import Configuration
            <input
              id="import-config-file"
              type="file"
              accept=".json"
              onChange={handleImport}
              className="sr-only"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Saved voice profiles</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsReceiving(true)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-bold text-white transition hover:bg-moss/90 dark:bg-glow dark:text-black"
            >
              Receive Profile
            </button>
            {profiles.length > 0 && (
              <button
                type="button"
                onClick={removeAllProfiles}
                className="text-sm font-bold text-coral hover:underline"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.length === 0 && (
            <p className="col-span-full p-4 text-sm text-ink/65 dark:text-muted border border-ink/10 rounded-md dark:border-border">
              No saved profiles yet.
            </p>
          )}
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.voice_id}
              profile={profile}
              onDelete={removeProfile}
              onShare={(p) => setSharingProfile(p)}
            />
          ))}
        </div>
      </section>
      
      {sharingProfile && (
        <ShareProfileModal 
          profile={sharingProfile} 
          onClose={() => setSharingProfile(null)} 
        />
      )}

      {isReceiving && (
        <ReceiveProfileModal 
          onClose={() => setIsReceiving(false)}
          onSuccess={async () => {
            const loaded = await getSavedProfiles();
            setProfiles(loaded);
            setIsReceiving(false);
            showToast("Profile received successfully!", "success");
          }}
        />
      )}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
