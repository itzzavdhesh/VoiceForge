import React, { useMemo } from 'react';
import { useSpeechHistory } from '../hooks/useSpeechHistory';
import { Download, BarChart2, MessageSquare, Clock, Globe } from 'lucide-react';

export default function Analytics() {
  const { analyticsHistory, sessionTranscript } = useSpeechHistory();

  // Metrics Calculations
  const metrics = useMemo(() => {
    const totalWords = analyticsHistory.reduce((acc, msg) => acc + msg.text.split(/\s+/).length, 0);
    const avgMessageLength = analyticsHistory.length ? Math.round(totalWords / analyticsHistory.length) : 0;
    
    // Session Duration
    let sessionDuration = "0m";
    if (sessionTranscript.length >= 2) {
      const first = sessionTranscript[0].timestamp;
      const last = sessionTranscript[sessionTranscript.length - 1].timestamp;
      const diffMinutes = Math.round((last - first) / 60000);
      sessionDuration = `${diffMinutes}m`;
    } else if (sessionTranscript.length === 1) {
      sessionDuration = "< 1m";
    }

    return { totalWords, avgMessageLength, sessionDuration };
  }, [analyticsHistory, sessionTranscript]);

  // Most Used Phrases
  const mostUsedPhrases = useMemo(() => {
    const counts = {};
    analyticsHistory.forEach(msg => {
      const text = msg.text.toLowerCase().trim();
      counts[text] = (counts[text] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [analyticsHistory]);

  // Language Distribution
  const languageData = useMemo(() => {
    const counts = {};
    analyticsHistory.forEach(msg => {
      const lang = msg.language || "Unknown";
      counts[lang] = (counts[lang] || 0) + 1;
    });
    const total = analyticsHistory.length || 1; // avoid div by 0
    let currentAngle = 0;
    
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
    
    const slices = Object.entries(counts).map(([lang, count], index) => {
      const percentage = count / total;
      const slice = {
        lang,
        count,
        percentage: (percentage * 100).toFixed(1),
        startAngle: currentAngle,
        endAngle: currentAngle + (percentage * 360),
        color: colors[index % colors.length]
      };
      currentAngle += percentage * 360;
      return slice;
    });

    return slices;
  }, [analyticsHistory]);

  // Usage over last 7 days
  const usageData = useMemo(() => {
    const days = 7;
    const data = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      d.setHours(0, 0, 0, 0);
      return {
        date: d,
        label: d.toLocaleDateString(undefined, { weekday: 'short' }),
        count: 0
      };
    });

    analyticsHistory.forEach(msg => {
      const msgDate = new Date(msg.timestamp);
      msgDate.setHours(0, 0, 0, 0);
      
      const dayData = data.find(d => d.date.getTime() === msgDate.getTime());
      if (dayData) {
        dayData.count++;
      }
    });

    const maxCount = Math.max(...data.map(d => d.count), 1); // Avoid div by 0

    return { data, maxCount };
  }, [analyticsHistory]);

  const exportCSV = () => {
    if (!analyticsHistory.length) return;
    
    const headers = ["ID", "Timestamp", "Language", "Text"];
    const rows = analyticsHistory.map(msg => [
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
    link.setAttribute("download", "voiceforge_analytics.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for pie chart SVG path
  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="flex flex-col gap-6 p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink dark:text-neutral-50 flex items-center gap-2">
            <BarChart2 className="text-moss dark:text-glow" />
            Speech Analytics
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Insights based on your last {analyticsHistory.length} messages.
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={analyticsHistory.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-moss text-white rounded-lg hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed dark:bg-glow dark:text-black dark:hover:bg-emerald-400 font-medium"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-border rounded-xl p-5 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <MessageSquare size={24} />
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Words</p>
            <p className="text-2xl font-bold text-ink dark:text-neutral-100">{metrics.totalWords}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-border rounded-xl p-5 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Avg. Length (words)</p>
            <p className="text-2xl font-bold text-ink dark:text-neutral-100">{metrics.avgMessageLength}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-border rounded-xl p-5 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
            <Globe size={24} />
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Session Duration</p>
            <p className="text-2xl font-bold text-ink dark:text-neutral-100">{metrics.sessionDuration}</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Usage Bar Chart */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-border rounded-xl p-5 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-ink dark:text-neutral-100 mb-6">Messages (Last 7 Days)</h3>
          
          <div className="flex-1 flex items-end gap-2 sm:gap-4 justify-between h-48 mt-auto pb-2">
            {usageData.data.map((item, i) => {
              const heightPct = (item.count / usageData.maxCount) * 100;
              return (
                <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                  <div className="relative w-full flex justify-center h-full items-end">
                    <div 
                      className="w-full max-w-[40px] bg-moss/20 dark:bg-glow/20 rounded-t-sm group-hover:bg-moss/40 dark:group-hover:bg-glow/40 transition-colors relative"
                      style={{ height: `${Math.max(heightPct, 2)}%` }} // min height 2%
                    >
                      <div 
                        className="absolute bottom-0 w-full bg-moss dark:bg-glow rounded-t-sm transition-all"
                        style={{ height: `${heightPct}%` }}
                      ></div>
                    </div>
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-ink text-white dark:bg-white dark:text-black text-xs py-1 px-2 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                      {item.count} messages
                    </div>
                  </div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most Used Phrases Table */}
        <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-ink dark:text-neutral-100 mb-4">Most Used Phrases</h3>
          
          {mostUsedPhrases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-neutral-500 uppercase bg-neutral-50 dark:bg-neutral-900/50 dark:text-neutral-400">
                  <tr>
                    <th scope="col" className="px-4 py-3 rounded-tl-lg">Phrase</th>
                    <th scope="col" className="px-4 py-3 rounded-tr-lg text-right">Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  {mostUsedPhrases.map(([phrase, count], idx) => (
                    <tr key={idx} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-ink dark:text-neutral-200 max-w-[200px] truncate" title={phrase}>
                        {phrase}
                      </td>
                      <td className="px-4 py-3 text-right text-moss dark:text-glow font-bold">
                        {count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-neutral-500 dark:text-neutral-400 text-sm">
              No phrases used yet.
            </div>
          )}
        </div>
      </div>

      {/* Language Distribution */}
      <div className="bg-white dark:bg-surface border border-neutral-200 dark:border-border rounded-xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-ink dark:text-neutral-100 mb-6">Language Distribution</h3>
        
        {languageData.length > 0 && analyticsHistory.length > 0 ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 lg:gap-16">
            {/* Pie Chart SVG */}
            <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex-shrink-0">
              <svg viewBox="-1 -1 2 2" className="w-full h-full transform -rotate-90">
                {languageData.map((slice, index) => {
                  if (slice.percentage === "100.0") {
                    return <circle key={index} cx="0" cy="0" r="1" fill={slice.color} />;
                  }
                  
                  const startPercent = slice.startAngle / 360;
                  const endPercent = slice.endAngle / 360;
                  
                  const [startX, startY] = getCoordinatesForPercent(startPercent);
                  const [endX, endY] = getCoordinatesForPercent(endPercent);
                  
                  const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0;
                  
                  const pathData = [
                    `M ${startX} ${startY}`, // Move
                    `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, // Arc
                    `L 0 0`, // Line to center
                  ].join(' ');

                  return (
                    <path
                      key={index}
                      d={pathData}
                      fill={slice.color}
                      className="hover:opacity-80 transition-opacity cursor-pointer stroke-white dark:stroke-surface stroke-[0.02]"
                    >
                      <title>{slice.lang}: {slice.percentage}%</title>
                    </path>
                  );
                })}
              </svg>
            </div>
            
            {/* Legend */}
            <div className="flex flex-col gap-3 min-w-[150px]">
              {languageData.map((slice, index) => (
                <div key={index} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: slice.color }}
                    ></span>
                    <span className="text-sm font-medium text-ink dark:text-neutral-200 truncate max-w-[120px]">
                      {slice.lang}
                    </span>
                  </div>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">
                    {slice.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-neutral-500 dark:text-neutral-400 text-sm">
            No language data available.
          </div>
        )}
      </div>

    </div>
  );
}
