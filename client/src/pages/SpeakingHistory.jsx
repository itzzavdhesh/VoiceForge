import React, { useEffect, useState } from "react";
import {
  Copy,
  Trash2,
  Star,
  Volume2,
  Clock,
  Mic2,
} from "lucide-react";

const defaultHistory = [
  {
    id: 1,
    text: "Hello everyone, welcome to today's meeting.",
    voice: "My Voice",
    timestamp: "02 Aug 2026 • 10:30 AM",
    favorite: false,
  },
  {
    id: 2,
    text: "Thank you for your time and attention.",
    voice: "Podcast Voice",
    timestamp: "02 Aug 2026 • 11:15 AM",
    favorite: true,
  },
];

export default function SpeakingHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("voiceforge-history");

    if (saved) {
      setHistory(JSON.parse(saved));
    } else {
      setHistory(defaultHistory);
      localStorage.setItem(
        "voiceforge-history",
        JSON.stringify(defaultHistory)
      );
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "voiceforge-history",
      JSON.stringify(history)
    );
  }, [history]);

  const copyText = async (text) => {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const replaySpeech = (text) => {
    const speech = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(speech);
  };

  const toggleFavorite = (id) => {
    setHistory((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, favorite: !item.favorite }
          : item
      )
    );
  };

  const deleteItem = (id) => {
    if (!window.confirm("Delete this history item?")) return;

    setHistory((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  const clearAllHistory = () => {
    if (!window.confirm("Are you sure you want to clear all speaking history?")) return;
    setHistory([]);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold">
          Speaking History Timeline
        </h1>
        {history.length > 0 && (
          <button
            onClick={clearAllHistory}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-sm font-semibold transition"
          >
            <Trash2 size={16} />
            Clear All
          </button>
        )}
      </div>

      <p className="text-gray-500 mb-8">
        View, replay and manage your previously spoken phrases.
      </p>

      <div className="space-y-5">
        {history.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border bg-white dark:bg-neutral-900 shadow-sm p-5"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Mic2 size={18} />
                  {item.voice}
                </h2>

                <p className="text-gray-600 dark:text-gray-300 mt-3">
                  {item.text}
                </p>

                <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
                  <Clock size={16} />
                  {item.timestamp}
                </div>
              </div>

              <button
                onClick={() => toggleFavorite(item.id)}
                className="text-yellow-500"
              >
                <Star
                  size={22}
                  fill={item.favorite ? "currentColor" : "none"}
                />
              </button>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={() => replaySpeech(item.text)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
              >
                <Volume2 size={16} />
                Replay
              </button>

              <button
                onClick={() => copyText(item.text)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600"
              >
                <Copy size={16} />
                Copy
              </button>

              <button
                onClick={() => deleteItem(item.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        ))}

        {history.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No speaking history available.
          </div>
        )}
      </div>
    </div>
  );
}