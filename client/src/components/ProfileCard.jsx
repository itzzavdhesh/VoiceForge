import React, { useEffect, useState } from "react";
import { Play, Pause, Share2, Trash2, Briefcase, Heart, BookOpen, Sparkles, User, Palette } from "lucide-react";
import { saveVoiceProfile } from "../hooks/useVoiceClone.js";

export const COLOR_TAGS = {
  emerald: { label: "Emerald", badge: "bg-emerald-600 text-white", border: "border-emerald-500" },
  cobalt: { label: "Cobalt", badge: "bg-blue-600 text-white", border: "border-blue-600" },
  rose: { label: "Rose", badge: "bg-rose-600 text-white", border: "border-rose-500" },
  gold: { label: "Gold", badge: "bg-amber-600 text-white", border: "border-amber-500" },
  purple: { label: "Purple", badge: "bg-purple-600 text-white", border: "border-purple-500" },
};

export const AVATAR_ICONS = {
  user: User,
  briefcase: Briefcase,
  heart: Heart,
  book: BookOpen,
  sparkles: Sparkles,
};

export function ProfileCard({ profile, onDelete, onShare, onUpdate }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const audioRef = React.useRef(null);

  const activeColorKey = COLOR_TAGS[profile.colorTag] ? profile.colorTag : "emerald";
  const activeColor = COLOR_TAGS[activeColorKey];
  const IconComponent = AVATAR_ICONS[profile.avatarIcon] || User;

  useEffect(() => {
    if (profile.audioBlob) {
      const url = URL.createObjectURL(profile.audioBlob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [profile.audioBlob]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onplay = () => setIsPlaying(true);
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  async function handleSelectColor(colorKey) {
    try {
      const updated = { ...profile, colorTag: colorKey };
      await saveVoiceProfile(updated, profile.audioBlob);
      onUpdate?.(updated);
    } catch (err) {
      console.error("Failed to update profile color:", err);
    }
  }

  async function handleSelectIcon(iconKey) {
    try {
      const updated = { ...profile, avatarIcon: iconKey };
      await saveVoiceProfile(updated, profile.audioBlob);
      onUpdate?.(updated);
    } catch (err) {
      console.error("Failed to update profile icon:", err);
    }
  }

  const formattedDate = profile.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString()
    : "Unknown date";

  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border border-ink/10 bg-white shadow-soft transition-all hover:shadow-soft-md dark:border-border dark:bg-surface dark:shadow-soft-dk`}>
      <div className="flex items-start justify-between bg-ink/5 p-4 dark:bg-black/20">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-ink dark:text-neutral-100">
              {profile.name}
            </h3>
            <span className={`inline-block h-2 w-2 rounded-full ${activeColor.badge}`} title={`Tag: ${activeColor.label}`} />
          </div>
          <p className="text-xs text-ink/60 dark:text-muted mt-1">
            Created on {formattedDate}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCustomizing((prev) => !prev)}
            title="Customize Tag & Icon"
            aria-label="Customize profile avatar icon and color tag"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-ink/10 bg-white text-ink/60 transition hover:bg-neutral-100 hover:text-ink dark:border-border dark:bg-surface dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            <Palette size={14} aria-hidden="true" />
          </button>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${activeColor.badge} font-bold shadow-sm`}>
            <IconComponent size={20} aria-hidden="true" />
          </div>
        </div>
      </div>

      {isCustomizing && (
        <div className="border-b border-ink/10 bg-neutral-50 p-3 text-xs space-y-2 dark:border-border dark:bg-black/40">
          <div>
            <span className="font-bold text-ink/70 dark:text-neutral-300">Color Tag:</span>
            <div className="flex items-center gap-2 mt-1.5">
              {Object.entries(COLOR_TAGS).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectColor(key)}
                  title={item.label}
                  aria-label={`Select ${item.label} color tag`}
                  className={`h-5 w-5 rounded-full ${item.badge} transition-transform ${activeColorKey === key ? "ring-2 ring-moss ring-offset-1 scale-110" : "opacity-80 hover:opacity-100"}`}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="font-bold text-ink/70 dark:text-neutral-300">Avatar Icon:</span>
            <div className="flex items-center gap-2 mt-1.5">
              {Object.entries(AVATAR_ICONS).map(([key, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectIcon(key)}
                  title={key}
                  aria-label={`Select ${key} avatar icon`}
                  className={`flex h-7 w-7 items-center justify-center rounded-md border text-ink/80 transition-transform dark:text-neutral-200 ${profile.avatarIcon === key ? "border-moss bg-mint/20 text-moss font-bold scale-105 dark:border-glow dark:text-glow" : "border-neutral-200 bg-white hover:bg-neutral-100 dark:border-border dark:bg-surface"}`}
                >
                  <Icon size={14} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-1 flex-col p-4">
        <p className="mb-4 text-xs font-mono text-ink/50 dark:text-muted truncate">
          ID: {profile.voice_id}
        </p>

        {audioUrl && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-ink/5 bg-ink/5 p-2 dark:border-border dark:bg-black/20">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moss text-white hover:bg-moss/90 dark:bg-glow dark:text-black"
            >
              {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
            </button>
            <div className="h-6 flex-1 rounded-sm bg-ink/10 dark:bg-white/10 relative overflow-hidden flex items-center justify-between px-1">
              {/* Fake waveform for visual aesthetics */}
              {[...Array(20)].map((_, i) => (
                <div key={i} className="w-1 bg-moss dark:bg-glow rounded-full opacity-50" style={{ height: `${Math.max(20, Math.random() * 100)}%` }}></div>
              ))}
              {isPlaying && (
                <div className="absolute inset-0 bg-moss/20 dark:bg-glow/20 animate-pulse pointer-events-none"></div>
              )}
            </div>
            <audio ref={audioRef} src={audioUrl} className="hidden" />
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-2 border-t border-ink/5 dark:border-border">
          <button
            type="button"
            onClick={() => onShare(profile)}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-ink/5 py-2 text-sm font-bold text-ink transition hover:bg-ink/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
          >
            <Share2 size={16} />
            Share
          </button>
          <button
            type="button"
            onClick={() => onExport(profile)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ink/15 text-ink transition hover:bg-ink/5 dark:border-border dark:text-neutral-200 dark:hover:bg-white/5"
            title="Export Profile Backup (.vfp)"
          >
            <Download size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(profile.voice_id)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-coral/30 text-coral transition hover:bg-coral hover:text-white"
            title="Delete Profile"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
