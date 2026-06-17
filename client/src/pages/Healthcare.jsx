import React, { useState, useEffect } from "react";
import { dbRecovery } from "../utils/db.js";
import { Heart, Shield, RefreshCw, Lock, Unlock, Volume2 } from "lucide-react";

export default function Healthcare() {
  const [role, setRole] = useState("Admin");
  const [sessionCap, setSessionCap] = useState(10000);
  const [contrastActive, setContrastActive] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Caregiver PIN Lock State
  const [isLocked, setIsLocked] = useState(() => {
    return localStorage.getItem("vf_hc_pin_hash") ? true : false;
  });
  const [pinInput, setPinInput] = useState("");
  const [savedHash, setSavedHash] = useState(() => localStorage.getItem("vf_hc_pin_hash") || "");
  const [showSetup, setShowSetup] = useState(() => !localStorage.getItem("vf_hc_pin_hash"));
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  // Emergency & Custom Phrase Presets
  const [emergencyPhrases, setEmergencyPhrases] = useState(() => {
    const saved = localStorage.getItem("vf_hc_emergency_phrases");
    return saved ? JSON.parse(saved) : [
      "I need urgent assistance. Please call my primary caregiver.",
      "Please bring me my water and daily medication.",
      "I am experiencing severe physical discomfort, please help.",
      "I would like to rest. Please adjust the room temperature."
    ];
  });

  useEffect(() => {
    localStorage.setItem("vf_hc_emergency_phrases", JSON.stringify(emergencyPhrases));
  }, [emergencyPhrases]);

  const speak = (text) => {
    if (!text.trim()) return;
    if (!("speechSynthesis" in window)) {
      setStatusMsg("Speech synthesis not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
    setStatusMsg(`Speaking: "${text}"`);
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const handleWipeDb = async () => {
    if (window.confirm("WARNING: This will completely delete all profiles and transcripts. Continue?")) {
      const ok = await dbRecovery();
      if (ok) {
        setStatusMsg("Database wiped. Reloading...");
        setTimeout(() => window.location.reload(), 1500);
      }
    }
  };

  // AAC Tile configuration
  const aacTiles = [
    { label: "Water", emoji: "💧", text: "I need water, please." },
    { label: "Food", emoji: "🍎", text: "I am hungry. I need food, please." },
    { label: "Sleep", emoji: "😴", text: "I am tired. I want to sleep." },
    { label: "Pain", emoji: "⚡", text: "I am in pain." },
    { label: "Bathroom", emoji: "🚽", text: "I need to use the bathroom." },
    { label: "Yes", emoji: "👍", text: "Yes." },
    { label: "No", emoji: "👎", text: "No." },
    { label: "Help", emoji: "🆘", text: "Help me, please." },
    { label: "Happy", emoji: "😊", text: "I am happy." },
    { label: "Sad", emoji: "😢", text: "I am sad." },
    { label: "Hot", emoji: "🔥", text: "I feel hot." },
    { label: "Cold", emoji: "❄️", text: "I feel cold." }
  ];

  // Proper SHA-256 hash implementation using Web Crypto API
  const hashPin = async (pin) => {
    const salt = "vf_salt_12345";
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + pin);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleSetupPin = async (e) => {
    e.preventDefault();
    if (!newPin.match(/^\d{4,8}$/)) {
      alert("PIN must be 4 to 8 digits long.");
      return;
    }
    if (newPin !== confirmPin) {
      alert("PINs do not match.");
      return;
    }
    const hashed = await hashPin(newPin);
    localStorage.setItem("vf_hc_pin_hash", hashed);
    setSavedHash(hashed);
    setIsLocked(true);
    setShowSetup(false);
    setNewPin("");
    setConfirmPin("");
    alert("Caregiver PIN set successfully!");
  };

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (Date.now() < cooldownUntil) {
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
      alert(`Too many failed attempts. Cooldown: ${remaining}s.`);
      return;
    }
    const attemptHash = await hashPin(pinInput);
    if (attemptHash === savedHash) {
      setIsLocked(false);
      setPinInput("");
      setFailedAttempts(0);
    } else {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      if (attempts >= 5) {
        setCooldownUntil(Date.now() + 30000); // 30s cooldown
        alert("5 failed attempts. Locked for 30 seconds.");
      } else {
        alert(`Incorrect PIN. ${5 - attempts} attempts remaining.`);
      }
    }
  };

  const handleLock = () => {
    setIsLocked(true);
  };

  return (
    <div className={`space-y-6 ${contrastActive ? "contrast-125" : ""}`}>
      <header className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold dark:text-neutral-100">Healthcare Workspace</h2>
          <p className="mt-1 text-sm text-ink/65 dark:text-muted">
            Emergency assistance presets, AAC symbol board, and caregiver governance mode.
          </p>
        </div>
        <button
          onClick={() => setContrastActive(!contrastActive)}
          className="rounded-md border px-3 py-1.5 text-xs font-semibold dark:border-border hover:bg-neutral-100 dark:hover:bg-neutral-900"
        >
          {contrastActive ? "Normal Contrast" : "High Contrast Mode"}
        </button>
      </header>

      {statusMsg && (
        <div className="rounded-md border border-coral bg-coral/10 p-4 text-sm font-semibold text-ink dark:border-coral dark:bg-coral/20">
          {statusMsg}
        </div>
      )}

      {/* AAC Symbol Board (Phase 9) */}
      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2 dark:text-neutral-100">
          <Volume2 className="text-moss dark:text-glow" size={18} />
          AAC Symbol Board (Augmentative and Alternative Communication)
        </h3>
        <p className="text-sm text-ink/60 dark:text-muted">
          Click or press Enter on any tile to immediately speak the phrase using the active voice.
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {aacTiles.map((tile, idx) => (
            <button
              key={idx}
              onClick={() => speak(tile.text)}
              className="flex flex-col items-center justify-center border border-ink/10 rounded-xl p-4 hover:border-moss hover:bg-cloud dark:border-border dark:hover:border-glow dark:hover:bg-black transition-all"
              aria-label={`Speak need: ${tile.label}. Phrase: ${tile.text}`}
            >
              <span className="text-4xl mb-2" role="img" aria-hidden="true">{tile.emoji}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-ink/85 dark:text-neutral-300">{tile.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Patient Presets (Phase 8) */}
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 dark:text-neutral-100">
            <Heart className="text-moss dark:text-glow" size={18} />
            Patient Emergency Presets
          </h3>
          <p className="text-sm text-ink/60 dark:text-muted">
            Tap a preset to speak it. Caregiver can edit phrases below when unlocked.
          </p>

          <div className="space-y-3">
            {emergencyPhrases.map((phrase, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={phrase}
                  disabled={isLocked}
                  onChange={(e) => {
                    const updated = [...emergencyPhrases];
                    updated[idx] = e.target.value;
                    setEmergencyPhrases(updated);
                  }}
                  className="flex-1 rounded-md border border-ink/15 bg-white px-3 py-1.5 text-sm dark:border-border dark:bg-black dark:text-neutral-100 disabled:bg-neutral-100 dark:disabled:bg-neutral-900"
                />
                <button
                  onClick={() => speak(phrase)}
                  className="rounded bg-moss px-3 text-xs font-bold text-white hover:bg-moss/90 dark:bg-glow dark:text-black flex items-center justify-center"
                >
                  Speak
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Governance Controls & PIN Lock (Phase 10) */}
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 dark:text-neutral-100">
            <Shield className="text-moss dark:text-glow" size={18} />
            Voice Governance & PIN Lock
          </h3>
          
          {/* PIN Lock Status & Toggle */}
          <div className="border border-ink/10 rounded-md p-4 bg-cloud dark:border-border dark:bg-black space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold flex items-center gap-1.5 dark:text-neutral-200">
                {isLocked ? (
                  <>
                    <Lock size={15} className="text-red-500" /> Caregiver Mode Locked
                  </>
                ) : (
                  <>
                    <Unlock size={15} className="text-moss dark:text-glow" /> Caregiver Mode Unlocked
                  </>
                )}
              </span>
              {savedHash && isLocked && (
                <form onSubmit={handleUnlock} className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter PIN"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="w-20 px-2 py-1 text-xs border rounded bg-white dark:bg-surface dark:border-border dark:text-neutral-100"
                  />
                  <button type="submit" className="bg-moss px-2 py-1 text-[11px] font-bold text-white rounded dark:bg-glow dark:text-black">
                    Unlock
                  </button>
                </form>
              )}
              {savedHash && !isLocked && (
                <button onClick={handleLock} className="bg-red-500 px-3 py-1 text-xs font-bold text-white rounded hover:bg-red-600">
                  Lock Presets
                </button>
              )}
            </div>

            {showSetup && (
              <form onSubmit={handleSetupPin} className="border-t border-ink/10 pt-3 mt-2 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ink/50 dark:text-neutral-400 block">Setup Caregiver PIN</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="password"
                    placeholder="New PIN (4-8 digits)"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="px-2 py-1 text-xs border rounded bg-white dark:bg-surface dark:border-border dark:text-neutral-100"
                  />
                  <input
                    type="password"
                    placeholder="Confirm PIN"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    className="px-2 py-1 text-xs border rounded bg-white dark:bg-surface dark:border-border dark:text-neutral-100"
                  />
                </div>
                <button type="submit" className="w-full bg-moss py-1 text-xs font-bold text-white rounded dark:bg-glow dark:text-black">
                  Save PIN
                </button>
              </form>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink/50 dark:text-neutral-400 uppercase block">User Profile Role</label>
              <select
                value={role}
                disabled={isLocked}
                onChange={(e) => setRole(e.target.value)}
                className="w-full text-sm rounded border border-ink/15 bg-white p-2 dark:border-border dark:bg-surface disabled:bg-neutral-100 dark:disabled:bg-neutral-900"
              >
                <option value="Admin">Admin (Full Control)</option>
                <option value="Operator">Operator (Speech-only)</option>
                <option value="Guest">Guest (Limited Session)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-ink/50 dark:text-neutral-400 uppercase block">Session Character Cap</label>
              <input
                type="number"
                value={sessionCap}
                disabled={isLocked}
                onChange={(e) => setSessionCap(parseInt(e.target.value) || 0)}
                className="w-full text-sm rounded border border-ink/15 bg-white p-2 dark:border-border dark:bg-surface disabled:bg-neutral-100 dark:disabled:bg-neutral-900"
              />
            </div>

            <div className="border-t border-ink/10 pt-4 flex justify-between items-center">
              <div>
                <span className="font-bold text-sm text-ink dark:text-neutral-200 block">Database Recovery</span>
                <span className="text-xs text-ink/50 dark:text-neutral-400">Purge local IndexedDB database</span>
              </div>
              <button
                onClick={handleWipeDb}
                disabled={isLocked || role !== "Admin"}
                className="rounded bg-red-500 text-white font-bold py-1.5 px-3 text-xs hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
              >
                <RefreshCw size={12} /> Wipe Storage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
