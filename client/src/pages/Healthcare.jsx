import React, { useState } from "react";
import { dbRecovery } from "../utils/db.js";
import { Heart, Shield, RefreshCw, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function Healthcare() {
  const [role, setRole] = useState("Admin");
  const [sessionCap, setSessionCap] = useState(10000);
  const [contrastActive, setContrastActive] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const handleWipeDb = async () => {
    if (window.confirm("WARNING: This will completely delete all profiles and transcripts from local browser storage. Continue?")) {
      const ok = await dbRecovery();
      if (ok) {
        setStatusMsg("Database wiped. Reloading page...");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    }
  };

  const emergencyPhrases = [
    "I need urgent assistance. Please call my primary caregiver.",
    "Please bring me my water and daily medication.",
    "I am experiencing severe physical discomfort, please help.",
    "I would like to rest. Please adjust the room temperature."
  ];

  return (
    <div className="space-y-6">
      <header className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface">
        <h2 className="text-2xl font-bold dark:text-neutral-100">Healthcare Workspace</h2>
        <p className="mt-1 text-sm text-ink/65 dark:text-muted">
          Patient emergency assistance, caregiver communication tools, and local voice governance controls.
        </p>
      </header>

      {statusMsg && (
        <div className="rounded-md border border-coral bg-coral/10 p-4 text-sm font-semibold text-ink dark:border-coral dark:bg-coral/20">
          {statusMsg}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Patient quick replies */}
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 dark:text-neutral-100">
            <Heart className="text-moss dark:text-glow" size={18} />
            Patient Emergency Hotlinks
          </h3>
          <p className="text-sm text-ink/60 dark:text-muted">
            Tap any preset to copy it instantly for communication.
          </p>

          <div className="space-y-2">
            {emergencyPhrases.map((phrase, idx) => (
              <button
                key={idx}
                onClick={() => {
                  navigator.clipboard.writeText(phrase);
                  setStatusMsg(`Copied to clipboard: "${phrase}"`);
                  setTimeout(() => setStatusMsg(""), 2500);
                }}
                className="w-full text-left text-sm border border-ink/10 rounded-lg p-3 hover:bg-cloud transition dark:border-border dark:hover:bg-black"
              >
                "{phrase}"
              </button>
            ))}
          </div>
        </div>

        {/* Governance Controls */}
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 dark:text-neutral-100">
            <Shield className="text-moss dark:text-glow" size={18} />
            Voice Governance & RBAC
          </h3>
          <p className="text-sm text-ink/65 dark:text-muted leading-relaxed">
            Manage simulated organization permissions and characters consumption controls.
          </p>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink/50 dark:text-neutral-400 uppercase block">User Profile Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full text-sm rounded border border-ink/15 bg-white p-2 dark:border-border dark:bg-surface"
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
                onChange={(e) => setSessionCap(parseInt(e.target.value) || 0)}
                className="w-full text-sm rounded border border-ink/15 bg-white p-2 dark:border-border dark:bg-surface"
              />
            </div>

            <div className="border-t border-ink/10 pt-4 flex justify-between items-center">
              <div>
                <span className="font-bold text-sm text-ink dark:text-neutral-200 block">Database Recovery</span>
                <span className="text-xs text-ink/50 dark:text-neutral-400">Purge local IndexedDB database</span>
              </div>
              <button
                onClick={handleWipeDb}
                disabled={role !== "Admin"}
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
