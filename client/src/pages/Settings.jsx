// Lets users manage browser-stored voice profiles and configure voice synthesis settings.
import React from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import {
  deleteVoiceProfile,
  getSavedProfiles,
  clearAllVoiceProfiles,
} from "../hooks/useVoiceClone.js";

export default function Settings() {
  const [apiKey, setApiKey] = React.useState(
    localStorage.getItem("voiceforge:elevenlabsApiKey") || "",
  );
  const [profiles, setProfiles] = React.useState(getSavedProfiles());

  const defaultSettings = DEFAULT_VOICE_SETTINGS;
  const [voiceSettings, setVoiceSettings] = React.useState(loadVoiceSettings);
  const [language, setLanguage] = React.useState(loadLanguage);
  const selectedLangObj = getLanguageByCode(language);

  const [modelId, setModelId] = React.useState(() => {
    try {
      return localStorage.getItem("voiceforge:selectedModelId") || "eleven_multilingual_v2";
    } catch {
      return "eleven_multilingual_v2";
    }
  });

  function saveModelId(newModelId) {
    setModelId(newModelId);
    try {
      localStorage.setItem("voiceforge:selectedModelId", newModelId);
    } catch {
      // Storage unavailable
    }
  }

  const defaultSettings = { stability: 0.45, similarity_boost: 0.8, style: 0.2 };
  const [voiceSettings, setVoiceSettings] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("voiceforge:voiceSettings")) || defaultSettings;
    } catch {
      return defaultSettings;
    }
  });


  function saveVoiceSettings(newSettings) {
    setVoiceSettings(newSettings);
    persistVoiceSettings(newSettings);
    window.dispatchEvent(new Event("voiceforge:settingsChanged"));
  }

  const [playingPreset, setPlayingPreset] = React.useState(null);
  const audioRef = React.useRef(null);
  const audioContextRef = React.useRef(null);
  const sourceRef = React.useRef(null);
  const bassFilterRef = React.useRef(null);
  const midFilterRef = React.useRef(null);
  const trebleFilterRef = React.useRef(null);
  const pitchShifterRef = React.useRef(null);

  const cleanupPreview = React.useCallback(() => {
    setPlayingPreset(null);
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (e) {}
      sourceRef.current = null;
    }
    if (bassFilterRef.current) {
      try { bassFilterRef.current.disconnect(); } catch (e) {}
      bassFilterRef.current = null;
    }
    if (midFilterRef.current) {
      try { midFilterRef.current.disconnect(); } catch (e) {}
      midFilterRef.current = null;
    }
    if (trebleFilterRef.current) {
      try { trebleFilterRef.current.disconnect(); } catch (e) {}
      trebleFilterRef.current = null;
    }
    if (pitchShifterRef.current) {
      try {
        pitchShifterRef.current.input.disconnect();
        pitchShifterRef.current.output.disconnect();
      } catch (e) {}
      pitchShifterRef.current = null;
    }
    audioRef.current = null;
  }, []);

  const stopPreview = React.useCallback(() => {
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch (e) {}
    }
    try { window.speechSynthesis.cancel(); } catch (e) {}
    cleanupPreview();
  }, [cleanupPreview]);

  React.useEffect(() => {
    return () => {
      stopPreview();
    };
  }, [stopPreview]);

  async function playPresetPreview(presetKey, preset) {
    if (playingPreset) {
      stopPreview();
      if (playingPreset === presetKey) return;
    }
    
    const activeProfileId = localStorage.getItem("voiceforge:activeVoiceId") || (profiles[0]?.voice_id);
    if (!activeProfileId) {
      showToast("Please clone or select a voice profile first to hear previews.", "error");
      return;
    }
    
    setPlayingPreset(presetKey);
    
    try {
      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Testing VoiceForge presets.",
          voice_id: activeProfileId,
          language_code: language,
          voice_settings: {
            stability: preset.stability,
            style: preset.style,
            temperature: preset.temperature
          }
        })
      });
      
      if (!response.ok) {
        throw new Error("Speech synthesis failed");
      }
      
      const payload = await response.json();
      const audioUrl = payload.audioUrl;
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioCtx = audioContextRef.current;
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.playbackRate = preset.dspSpeed;
      
      const source = audioCtx.createMediaElementSource(audio);
      sourceRef.current = source;
      
      const bass = audioCtx.createBiquadFilter();
      bass.type = "lowshelf";
      bass.frequency.value = 200;
      bass.gain.value = preset.dspBass;
      bassFilterRef.current = bass;
      
      const mid = audioCtx.createBiquadFilter();
      mid.type = "peaking";
      mid.frequency.value = 1000;
      mid.Q.value = 1.0;
      mid.gain.value = preset.dspMid;
      midFilterRef.current = mid;
      
      const treble = audioCtx.createBiquadFilter();
      treble.type = "highshelf";
      treble.frequency.value = 4000;
      treble.gain.value = preset.dspTreble;
      trebleFilterRef.current = treble;
      
      const shifter = new PitchShifter(audioCtx);
      shifter.setPitch(preset.dspPitch);
      pitchShifterRef.current = shifter;
      
      source.connect(bass);
      bass.connect(mid);
      mid.connect(treble);
      treble.connect(shifter.input);
      shifter.output.connect(audioCtx.destination);
      
      audio.onended = () => {
        cleanupPreview();
      };
      
      await audio.play();
    } catch (err) {
      console.error("Failed to play preset preview:", err);
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("Testing VoiceForge presets.");
        utterance.lang = language;
        utterance.pitch = preset.dspPitch;
        utterance.rate = preset.dspSpeed;
        utterance.onend = () => setPlayingPreset(null);
        utterance.onerror = () => setPlayingPreset(null);
        window.speechSynthesis.speak(utterance);
      } catch (fallbackErr) {
        showToast("Preview play failed", "error");
        setPlayingPreset(null);
      }
    }
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

  React.useEffect(() => {
    function handleStorage(event) {
      const VOICE_SETTINGS_KEY = "voiceforge:voiceSettings";
      if (event.key === VOICE_SETTINGS_KEY) {
        setVoiceSettings(loadVoiceSettings());
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleExport = async () => {
    try {
      const storageData = {
        history: localStorage.getItem("vf_history"),
        favorites: localStorage.getItem("vf_favorites"),
        quick_replies: localStorage.getItem("vf_quick_replies"),
        voiceSettings: localStorage.getItem("voiceforge:voiceSettings"),
        language: localStorage.getItem(LANGUAGE_STORAGE_KEY),
        calibrationXOffset: localStorage.getItem(
          "voiceforge:calibrationXOffset",
        ),
        calibrationYOffset: localStorage.getItem(
          "voiceforge:calibrationYOffset",
        ),
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
        }),
      );

      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        storage: storageData,
        profiles: profilesData,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
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
        "Importing this backup will overwrite your current settings, speech history, and voice profiles. Do you want to continue?",
      );
      if (!confirmOverwrite) {
        event.target.value = "";
        return;
      }

      const text = await file.text();
      const backup = JSON.parse(text);

      if (
        !backup ||
        backup.version !== 1 ||
        !backup.storage ||
        !Array.isArray(backup.profiles)
      ) {
        throw new Error("Invalid backup file format.");
      }

      const { storage, profiles: importedProfiles } = backup;

      // 3. Process voice profiles first - if any fail, we don't modify localStorage
      const profilesToSave = [];
      for (const p of importedProfiles) {
        let audioBlob = null;
        if (p.audioDataUrl) {
          try {
            if (
              typeof p.audioDataUrl === "string" &&
              p.audioDataUrl.startsWith("data:audio/")
            ) {
              const res = await fetch(p.audioDataUrl);
              audioBlob = await res.blob();
            } else {
              console.warn(
                "Skipped invalid or non-audio DataURL in voice profile backup:",
                p.name,
              );
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
      function sanitizeCalibrationValue(key, raw) {
        if (raw === null || raw === undefined) return raw;
        const num = parseFloat(raw);
        if (isNaN(num)) return null;
        switch (key) {
          case "calibrationXOffset": return Math.max(-400, Math.min(400, Math.round(num))).toString();
          case "calibrationYOffset": return Math.max(-250, Math.min(150, Math.round(num))).toString();
          case "calibrationScale": return Math.max(0.5, Math.min(2.5, num)).toString();
          default: return raw;
        }
      }

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
          const val = sanitizeCalibrationValue(backupKey, storage[backupKey]);
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

  const handleExportProfile = async (profile) => {
    try {
      let base64Audio = null;
      if (profile.audioBlob) {
        base64Audio = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(profile.audioBlob);
        });
      }
      
      const vfpData = {
        type: "voiceforge_profile",
        version: 1,
        voice_id: profile.voice_id,
        name: profile.name,
        createdAt: profile.createdAt,
        audioDataUrl: base64Audio
      };
      
      const jsonContent = JSON.stringify(vfpData, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${profile.name.replace(/\s+/g, "_")}.vfp`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Exported backup for ${profile.name}`, "success");
    } catch (err) {
      console.error("Failed to export profile:", err);
      showToast("Failed to export voice profile", "error");
    }
  };

  const handleImportVFP = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".vfp")) {
      showToast("Invalid file format. Please upload a .vfp file.", "error");
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (
        parsed.type !== "voiceforge_profile" ||
        !parsed.voice_id ||
        !parsed.name ||
        !parsed.audioDataUrl
      ) {
        throw new Error("Missing or invalid profile fields.");
      }

      const arr = parsed.audioDataUrl.split(",");
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "audio/wav";
      
      if (!mime.startsWith("audio/")) {
        throw new Error("Embedded file is not a valid audio format.");
      }

      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const audioBlob = new Blob([u8arr], { type: mime });

      await saveVoiceProfile({
        voice_id: parsed.voice_id,
        name: parsed.name
      }, audioBlob);

      showToast(`Imported ${parsed.name} successfully!`, "success");
      event.target.value = "";
    } catch (err) {
      console.error("VFP Import failed:", err);
      showToast("VFP import failed: " + (err.message || String(err)), "error");
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
          Store your ElevenLabs key for local experiments and manage voice
          profiles saved in this browser.
        </p>
      </section>
      {dbError && (
        <div className="flex items-center gap-2 rounded-md border border-coral/40 bg-coral/10 p-4 text-sm font-semibold text-ink">
          <CircleAlert size={18} aria-hidden="true" />
          <span>Database error: {dbError}</span>
        </div>

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">

          <label className="flex-1 text-sm font-bold" htmlFor="api-key">
            ElevenLabs API key
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
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
          The backend reads `.env` first. This local key is available for future
          client-only experiments.
        </p>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk">
        <h2 className="text-xl font-bold">Voice Synthesis Settings</h2>
        <p className="mt-1 text-sm text-ink/65 mb-5">Adjust how ElevenLabs generates your cloned speech.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2 text-ink dark:text-neutral-100" htmlFor="model-select">
              ElevenLabs Model (Latency & Language)
            </label>
            <select
              id="model-select"
              value={modelId}
              onChange={(e) => saveModelId(e.target.value)}
              className="min-h-11 w-full rounded-md border border-ink/15 bg-cloud px-3 text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint dark:border-border dark:bg-black dark:text-neutral-100 dark:focus:border-glow dark:focus:ring-glow/25"
            >
              <option value="eleven_flash_v2_5">Eleven Flash v2.5 (Ultra-low latency - Recommended for live calls)</option>
              <option value="eleven_turbo_v2_5">Eleven Turbo v2.5 (Low latency - High quality)</option>
              <option value="eleven_multilingual_v2">Eleven Multilingual v2 (Standard Multilingual)</option>
              <option value="eleven_monolingual_v1">Eleven Monolingual v1 (Standard English)</option>
            </select>
            <p className="text-xs text-ink/50 mt-1 dark:text-neutral-400">
              Flash and Turbo models generate audio much faster, reducing conversation delays.
            </p>
          </div>

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
              </div>
              <button
                type="button"
                onClick={() => removeProfile(profile.voice_id)}
                title={`Delete voice profile "${profile.name}"`}
                aria-label={`Delete voice profile "${profile.name}"`}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-coral/40 px-3 py-2 font-bold text-coral hover:bg-coral hover:text-white"
              >
                <Trash2 size={16} aria-hidden="true" />
                Delete
              </button>
            </div>
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

      {isTransferOpen && (
        <TransferSetupModal
          onClose={() => setIsTransferOpen(false)}
        />
      )}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
