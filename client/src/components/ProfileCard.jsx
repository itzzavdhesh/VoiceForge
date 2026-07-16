import React, { useEffect, useState } from "react";
import { Play, Pause, Share2, Trash2 } from "lucide-react";

export function ProfileCard({ profile, onDelete, onShare }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = React.useRef(null);

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

  const formattedDate = profile.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString()
    : "Unknown date";

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-ink/10 bg-white shadow-soft transition-all hover:shadow-soft-md dark:border-border dark:bg-surface dark:shadow-soft-dk">
      <div className="flex items-start justify-between bg-ink/5 p-4 dark:bg-black/20">
        <div>
          <h3 className="font-bold text-lg text-ink dark:text-neutral-100">
            {profile.name}
          </h3>
          <p className="text-xs text-ink/60 dark:text-muted mt-1">
            Created on {formattedDate}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full bg-moss/20 text-moss dark:bg-glow/20 dark:text-glow font-bold uppercase text-sm">
          {profile.name.substring(0, 2)}
        </div>
      </div>
      
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
