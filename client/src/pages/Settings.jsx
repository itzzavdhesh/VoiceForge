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
import { PitchShifter } from "../utils/pitchShifter.js";

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
        
        <div className="mb-6">
          <label className="mb-3 block text-sm font-bold text-ink dark:text-neutral-200">
            Voice Presets & Previews
          </label>
          <div className="flex flex-wrap gap-2.5">
            {Object.entries(VOICE_PRESETS).map(([key, preset]) => {
              const isActive = currentPresetKey === key;
              const isPlaying = playingPreset === key;
              return (
                <div
                  key={key}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition duration-150 ${
                    isActive
                      ? "border-moss bg-mint/10 text-ink dark:border-glow dark:bg-glow/10 dark:text-neutral-100"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-moss/40 hover:bg-neutral-50 dark:border-border dark:bg-black dark:text-neutral-300 dark:hover:border-glow/40 dark:hover:bg-glow/5"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handlePresetChange(key)}
                    className="outline-none text-left font-bold"
                  >
                    {preset.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => playPresetPreview(key, preset)}
                    aria-label={isPlaying ? `Stop previewing ${preset.name}` : `Preview ${preset.name} voice`}
                    className={`ml-1 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-150 ${
                      isPlaying
                        ? "bg-coral text-white scale-105"
                        : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {isPlaying ? (
                      <span className="block h-2 w-2 rounded-sm bg-white" />
                    ) : (
                      <svg className="h-3 w-3 fill-current ml-0.5" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}
            
            <div
              className={`inline-flex items-center rounded-lg border px-3.5 py-2 text-sm font-semibold ${
                currentPresetKey === "custom"
                  ? "border-moss bg-mint/10 text-ink dark:border-glow dark:bg-glow/10 dark:text-neutral-100"
                  : "border-dashed border-neutral-300 bg-transparent text-neutral-400 dark:border-neutral-700 dark:text-neutral-500"
              }`}
            >
              Custom Settings
            </div>
          </div>
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
