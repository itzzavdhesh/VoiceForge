// Lets users manage browser-stored voice profiles and configure voice synthesis settings.
import React from "react";
import {
  DEFAULT_VOICE_SETTINGS,
  loadVoiceSettings,
  persistVoiceSettings,
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
          const arr = p.audioDataUrl.split(",");
          const mime = arr[0].match(/:(.*?);/)?.[1] || "audio/webm";
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          audioBlob = new Blob([u8arr], { type: mime });
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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Saved voice profiles</h2>
          {profiles.length > 0 && (
            <button
              type="button"
              onClick={removeAllProfiles}
              className="text-sm font-bold text-coral hover:underline"
            >
              Clear All Profiles
            </button>
          )}
        </div>
        <div className="mt-4 divide-y divide-ink/10 rounded-md border border-ink/10 dark:divide-border dark:border-border">
          {profiles.length === 0 && (
            <p className="p-4 text-sm text-ink/65 dark:text-muted">
              No saved profiles yet.
            </p>
          )}
          {profiles.map((profile) => (
            <div
              key={profile.voice_id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold">{profile.name}</p>
                <p className="mt-1 break-all text-sm text-ink/60 dark:text-muted">
                  {profile.voice_id}
                </p>
                {profile.audioBlob && <AudioPlayback blob={profile.audioBlob} />}
 
              </div>
              <button
                type="button"
                onClick={() => removeProfile(profile.voice_id)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-coral/40 px-3 py-2 font-bold text-coral hover:bg-coral hover:text-white"
              >
                <Trash2 size={16} aria-hidden="true" />
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
      <ToastContainer toasts={toasts} />
    </div>
  );
}
