// Lets users save their ElevenLabs API key for the current session and manage browser-stored voice profiles.
import React from "react";
import { getApiKey, setApiKey, migrateFromLocalStorage } from "../utils/apiKeyStorage.js";
import {
  DEFAULT_VOICE_SETTINGS,
  loadVoiceSettings,
  persistVoiceSettings,
} from "../utils/voiceSettings.js";

import { ExternalLink, Trash2, CircleAlert, Download, Upload } from "lucide-react";
import { useToast, ToastContainer } from "../components/useToast.jsx";
import {
  deleteVoiceProfile,
  getSavedProfiles,
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
  const [migratedNotice, setMigratedNotice] = React.useState(false);
  const [apiKey, setApiKeyInput] = React.useState(() => {
    try {
      return getApiKey();
    } catch {
      return "";
    }
  });

  React.useEffect(() => {
    const migrated = migrateFromLocalStorage();
    if (migrated) {
      setApiKeyInput(getApiKey());
      setMigratedNotice(true);
    }
  }, []);

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

  function saveApiKey() {
    setApiKey(apiKey);
    showToast("API key saved", "success");
  }



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
        {migratedNotice && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-moss/40 bg-mint/30 p-3 text-sm text-ink dark:bg-glow/10 dark:text-neutral-100">
            <CircleAlert size={16} className="mt-0.5 shrink-0 text-moss" aria-hidden="true" />
            <span>
              Your saved API key has been moved out of persistent storage for this session.
              It will clear when you close this tab.
            </span>
          </div>
        )}
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-400/40 bg-amber-50 p-3 text-sm text-ink dark:bg-amber-900/20 dark:text-neutral-100">
          <CircleAlert size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
          <span>
            <strong>Session-only key</strong> — cleared when you close this tab and not shared
            with other tabs. For a persistent setup, set the key in the server{" "}
            <code className="font-mono">.env</code> file instead.
          </span>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">

          <label className="flex-1 text-sm font-bold" htmlFor="api-key">
            ElevenLabs API key
            <input
              id="api-key"
              type="password"
              value={apiKey}

              onChange={(event) => setApiKeyInput(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-md border border-ink/15 bg-cloud px-3 text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint dark:border-border dark:bg-black dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-glow dark:focus:ring-glow/25"


              placeholder="sk_..."
            />
          </label>
          <button
            type="button"
            onClick={saveApiKey}
            className="min-h-11 rounded-md bg-moss px-5 font-bold text-white"
          >
            Save key
          </button>
          <a
            href="https://elevenlabs.io/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-ink/15 px-4 font-bold text-ink hover:border-moss hover:text-moss dark:border-border dark:text-neutral-200 dark:hover:border-glow dark:hover:text-glow"
          >
            Free tier
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>
        <p className="mt-3 text-sm text-ink/65 dark:text-muted">
          Your key is kept for this browser session only — it is cleared when
          you close the tab and is not shared with other tabs. You will need to
          re-enter it each session. The backend reads{" "}
          <code className="font-mono">.env</code> first; this field is a
          client-side override.
        </p>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk">
        <h2 className="text-xl font-bold">Voice Synthesis Settings</h2>
        <p className="mt-1 text-sm text-ink/65 mb-5">Adjust how ElevenLabs generates your cloned speech.</p>
        
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
            <label className="flex justify-between text-sm font-bold" htmlFor="similarity">
              <span>Similarity Boost</span>
              <span className="text-ink/65">{voiceSettings.similarity_boost}</span>
            </label>
            <input
              id="similarity"
              type="range"
              min="0" max="1" step="0.01"
              value={voiceSettings.similarity_boost}
              onChange={(e) => saveVoiceSettings({ ...voiceSettings, similarity_boost: parseFloat(e.target.value) })}
              className="w-full mt-2"
            />
            <p className="text-xs text-ink/50 mt-1">Higher values make the voice closer to the original but may introduce artifacts.</p>
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

          {/* ── Speaker Boost toggle ── */}
          <div className="flex items-center justify-between rounded-lg border border-ink/10 p-4 dark:border-border">
            <div>
              <p className="text-sm font-bold text-ink dark:text-neutral-200">
                Speaker Boost
              </p>
              <p
                id="settings-speaker-boost-desc"
                className="mt-0.5 text-xs text-ink/55 dark:text-muted"
              >
                Boosts similarity to the reference speaker. Disable if you hear metallic artifacts.
              </p>
            </div>
            <button
              id="settings-speaker-boost"
              type="button"
              role="switch"
              aria-checked={voiceSettings.use_speaker_boost}
              aria-describedby="settings-speaker-boost-desc"
              onClick={() =>
                saveVoiceSettings({
                  ...voiceSettings,
                  use_speaker_boost: !voiceSettings.use_speaker_boost,
                })
              }
              className={[
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent",
                "transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-moss focus:ring-offset-2 dark:focus:ring-glow dark:focus:ring-offset-black",
                voiceSettings.use_speaker_boost
                  ? "bg-moss dark:bg-glow"
                  : "bg-neutral-300 dark:bg-neutral-600",
              ].join(" ")}
              aria-label="Toggle Speaker Boost"
            >
              <span
                className={[
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
                  voiceSettings.use_speaker_boost ? "translate-x-5" : "translate-x-0",
                ].join(" ")}
              />
            </button>
          </div>
        </div>
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
        <h2 className="text-xl font-bold">Saved voice profiles</h2>
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