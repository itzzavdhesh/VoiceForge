import React, { useState } from "react";
import { Mic2, Pencil, Copy, Trash2, Star } from "lucide-react";

const initialVoices = [
  {
    id: 1,
    name: "My Voice",
    createdAt: "02 Aug 2026",
    duration: "1m 42s",
    isDefault: true,
  },
  {
    id: 2,
    name: "Podcast Voice",
    createdAt: "30 Jul 2026",
    duration: "2m 15s",
    isDefault: false,
  },
  {
    id: 3,
    name: "Narrator",
    createdAt: "25 Jul 2026",
    duration: "1m 05s",
    isDefault: false,
  },
];

export default function VoiceProfiles() {
  const [voices, setVoices] = useState(initialVoices);

  const renameVoice = (id) => {
    const newName = prompt("Enter new profile name");

    if (!newName) return;

    setVoices((prev) =>
      prev.map((voice) =>
        voice.id === id ? { ...voice, name: newName } : voice
      )
    );
  };

  const duplicateVoice = (voice) => {
    setVoices((prev) => [
      ...prev,
      {
        ...voice,
        id: Date.now(),
        name: `${voice.name} Copy`,
        isDefault: false,
      },
    ]);
  };

  const deleteVoice = (id) => {
    const ok = window.confirm(
      "Are you sure you want to delete this voice profile?"
    );

    if (!ok) return;

    setVoices((prev) => prev.filter((voice) => voice.id !== id));
  };

  const setDefault = (id) => {
    setVoices((prev) =>
      prev.map((voice) => ({
        ...voice,
        isDefault: voice.id === id,
      }))
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-2">
        Voice Profile Management
      </h1>

      <p className="text-gray-500 mb-8">
        Manage all your cloned voice profiles in one place.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {voices.map((voice) => (
          <div
            key={voice.id}
            className="rounded-xl border p-6 shadow-sm bg-white dark:bg-neutral-900"
          >
            <div className="flex justify-between items-center">
              <Mic2 className="text-blue-600" />

              {voice.isDefault && (
                <span className="flex items-center gap-1 text-yellow-500 text-sm font-semibold">
                  <Star size={16} fill="currentColor" />
                  Default
                </span>
              )}
            </div>

            <h2 className="text-xl font-semibold mt-4">
              {voice.name}
            </h2>

            <p className="text-sm text-gray-500 mt-2">
              Created: {voice.createdAt}
            </p>

            <p className="text-sm text-gray-500">
              Duration: {voice.duration}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => renameVoice(voice.id)}
                className="flex items-center gap-1 rounded bg-blue-500 text-white px-3 py-2 text-sm hover:bg-blue-600"
              >
                <Pencil size={15} />
                Rename
              </button>

              <button
                onClick={() => duplicateVoice(voice)}
                className="flex items-center gap-1 rounded bg-green-500 text-white px-3 py-2 text-sm hover:bg-green-600"
              >
                <Copy size={15} />
                Duplicate
              </button>

              <button
                onClick={() => deleteVoice(voice.id)}
                className="flex items-center gap-1 rounded bg-red-500 text-white px-3 py-2 text-sm hover:bg-red-600"
              >
                <Trash2 size={15} />
                Delete
              </button>

              {!voice.isDefault && (
                <button
                  onClick={() => setDefault(voice.id)}
                  className="flex items-center gap-1 rounded bg-yellow-500 text-white px-3 py-2 text-sm hover:bg-yellow-600"
                >
                  <Star size={15} />
                  Set Default
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}