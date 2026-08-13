import React, { useState, useEffect } from "react";
import { getAllTranscripts, getAllSessions } from "../utils/db.js";
import { BarChart3, TrendingUp, DollarSign, Award, Clock } from "lucide-react";

export default function Analytics() {
  const [stats, setStats] = useState({
    totalCharacters: 0,
    totalWords: 0,
    totalAudioSize: 0,
    estimatedCost: 0,
    totalSpeechClips: 0,
    voiceRankings: [],
    languagesUsed: {}
  });

  useEffect(() => {
    async function calculateStats() {
      try {
        const transcripts = await getAllTranscripts();
        let chars = 0;
        let words = 0;
        let cost = 0;
        const voiceCounts = {};
        const langCounts = {};

        transcripts.forEach(t => {
          chars += t.text?.length || 0;
          words += (t.text || "").split(/\s+/).filter(Boolean).length;
          cost += (t.text?.length || 0) * 0.00015; // Estimating ElevenLabs costs
          
          if (t.voice_id) {
            voiceCounts[t.voice_id] = (voiceCounts[t.voice_id] || 0) + 1;
          }
          if (t.language_code) {
            langCounts[t.language_code] = (langCounts[t.language_code] || 0) + 1;
          }
        });

        const sortedVoices = Object.entries(voiceCounts)
          .map(([id, count]) => ({ id, count }))
          .sort((a, b) => b.count - a.count);

        setStats({
          totalCharacters: chars,
          totalWords: words,
          estimatedCost: cost,
          totalSpeechClips: transcripts.length,
          voiceRankings: sortedVoices,
          languagesUsed: langCounts
        });
      } catch (err) {
        console.error("Error loading analytics:", err);
      }
    });

    const maxCount = Math.max(...data.map(d => d.count), 1);
    return { data, maxCount };
  }, [filteredHistory, dateRange]);

  const exportCSV = () => {
    if (!filteredHistory.length) return;
    
    const headers = ["ID", "Timestamp", "Language", "Text"];
    const rows = filteredHistory.map(msg => [
      msg.id,
      new Date(msg.timestamp).toISOString(),
      msg.language || "Unknown",
      `"${msg.text.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `voiceforge_analytics_${dateRange}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

    window.addEventListener("vf-transcript-saved", calculateStats);
    return () => window.removeEventListener("vf-transcript-saved", calculateStats);
  }, []);

  return (
    <div className="space-y-6">
      <header className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface">
        <h2 className="text-2xl font-bold dark:text-neutral-100">Voice Analytics Dashboard</h2>
        <p className="mt-1 text-sm text-ink/65 dark:text-muted">
          Real-time metrics, costs, and statistics gathered from your local communication history.
        </p>
      </header>

      {/* Analytics summary grid */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface flex items-center gap-4">
          <div className="rounded-lg bg-moss/10 p-3 text-moss dark:bg-glow/20 dark:text-glow">
            <BarChart3 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-ink/50 dark:text-muted uppercase tracking-wider">Total Words Spoken</p>
            <h3 className="text-2xl font-bold mt-1 dark:text-neutral-50">{stats.totalWords.toLocaleString()}</h3>
            <p className="text-xs text-ink/40 dark:text-neutral-400">{stats.totalCharacters.toLocaleString()} characters</p>
          </div>
        </div>

        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface flex items-center gap-4">
          <div className="rounded-lg bg-moss/10 p-3 text-moss dark:bg-glow/20 dark:text-glow">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-ink/50 dark:text-muted uppercase tracking-wider">Estimated Cost</p>
            <h3 className="text-2xl font-bold mt-1 text-moss dark:text-glow">${stats.estimatedCost.toFixed(4)}</h3>
            <p className="text-xs text-ink/40 dark:text-neutral-400">Calculated locally per character</p>
          </div>
        </div>

        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface flex items-center gap-4">
          <div className="rounded-lg bg-moss/10 p-3 text-moss dark:bg-glow/20 dark:text-glow">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-ink/50 dark:text-muted uppercase tracking-wider">Speech Generations</p>
            <h3 className="text-2xl font-bold mt-1 dark:text-neutral-50">{stats.totalSpeechClips} clips</h3>
            <p className="text-xs text-ink/40 dark:text-neutral-400">Stored in local IndexedDB</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Voice Rankings */}
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 dark:text-neutral-100">
            <Award size={18} className="text-moss dark:text-glow" />
            Favorite Voices (Smart Ranking)
          </h3>
          {stats.voiceRankings.length === 0 ? (
            <p className="text-sm text-ink/50 dark:text-muted py-4 text-center">No voice metrics recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {stats.voiceRankings.map((vr, idx) => {
                const max = stats.voiceRankings[0].count;
                const widthPercent = (vr.count / max) * 100;
                return (
                  <div key={vr.id}>
                    <div className="flex justify-between text-sm mb-1 font-semibold">
                      <span>ID: {vr.id}</span>
                      <span className="text-ink/60 dark:text-muted">{vr.count} calls</span>
                    </div>
                    <div className="h-2 w-full bg-cloud dark:bg-black rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-moss to-mint dark:from-glow dark:to-mint rounded-full"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Languages Usage */}
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 dark:text-neutral-100">
            <TrendingUp size={18} className="text-moss dark:text-glow" />
            Language Distribution
          </h3>
          {Object.keys(stats.languagesUsed).length === 0 ? (
            <p className="text-sm text-ink/50 dark:text-muted py-4 text-center">No language data recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(stats.languagesUsed).map(([lang, count]) => {
                const total = stats.totalSpeechClips || 1;
                const percent = ((count / total) * 100).toFixed(1);
                return (
                  <div key={lang}>
                    <div className="flex justify-between text-sm mb-1 font-semibold">
                      <span className="uppercase">{lang}</span>
                      <span className="text-ink/60 dark:text-muted">{count} clips ({percent}%)</span>
                    </div>
                    <div className="h-2 w-full bg-cloud dark:bg-black rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-moss to-mint dark:from-glow dark:to-mint rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Vocabulary Diversity Word Cloud */}
      <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-border rounded-xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-ink dark:text-neutral-100 mb-6">Vocabulary Diversity (Word Cloud)</h3>
        {wordCloudData.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-4 py-8 px-4 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl min-h-[160px]">
            {wordCloudData.map((word, idx) => (
              <span
                key={word.text}
                title={`Spoken ${word.value} time${word.value !== 1 ? "s" : ""}`}
                className={`${getWordColorClass(idx)} hover:scale-110 hover:opacity-80 transition-all duration-150 cursor-help whitespace-nowrap inline-block`}
                style={{ fontSize: getWordFontSize(word.value) }}
              >
                {word.text}
              </span>
            ))}
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-neutral-500 dark:text-neutral-400 text-sm">
            No vocabulary data available for this period.
          </div>
        )}
      </div>

    </div>
  );
}
