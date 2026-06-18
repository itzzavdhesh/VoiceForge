import React, { useState, useEffect } from "react";
import { getAllCollections, saveCollection, deleteCollection, getAllProfiles } from "../utils/db.js";
import { Folder, FolderPlus, Trash2, Cpu, Globe, Share2 } from "lucide-react";

export default function Library() {
  const [collections, setCollections] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [newColName, setNewColName] = useState("");
  const [onnxLoading, setOnnxLoading] = useState(false);
  const [onnxLoaded, setOnnxLoaded] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const loadData = async () => {
    try {
      const cols = await getAllCollections();
      setCollections(cols);

      const voices = await getAllProfiles();
      setProfiles(voices);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    const newCol = {
      id: "col_" + Date.now(),
      name: newColName.trim(),
      voiceIds: []
    };

    try {
      await saveCollection(newCol);
      setCollections(prev => [...prev, newCol]);
      setNewColName("");
      setStatusMsg("Collection folder created successfully!");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCollection = async (id) => {
    if (window.confirm("Are you sure you want to delete this collection?")) {
      await deleteCollection(id);
      setCollections(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleAddVoiceToCol = async (colId, voiceId) => {
    const col = collections.find(c => c.id === colId);
    if (!col) return;

    if (col.voiceIds.includes(voiceId)) return;

    const updated = {
      ...col,
      voiceIds: [...col.voiceIds, voiceId]
    };

    try {
      await saveCollection(updated);
      setCollections(prev => prev.map(c => c.id === colId ? updated : c));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveVoiceFromCol = async (colId, voiceId) => {
    const col = collections.find(c => c.id === colId);
    if (!col) return;

    const updated = {
      ...col,
      voiceIds: col.voiceIds.filter(id => id !== voiceId)
    };

    try {
      await saveCollection(updated);
      setCollections(prev => prev.map(c => c.id === colId ? updated : c));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoadOnnx = () => {
    setOnnxLoading(true);
    setTimeout(() => {
      setOnnxLoading(false);
      setOnnxLoaded(true);
      setStatusMsg("ONNX Web Runtime: Tiny-vocoder model weights compiled successfully!");
      setTimeout(() => setStatusMsg(""), 4000);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <header className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface">
        <h2 className="text-2xl font-bold dark:text-neutral-100">Voice Library & AI inference</h2>
        <p className="mt-1 text-sm text-ink/65 dark:text-muted">
          Organize cloned voice profiles into collections folders and manage local browser weights.
        </p>
      </header>

      {statusMsg && (
        <div className="rounded-md border border-mint bg-mint/10 p-4 text-sm font-semibold text-moss dark:border-glow dark:bg-glow/15 dark:text-glow">
          {statusMsg}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Collections folders */}
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 dark:text-neutral-100">
            <Folder className="text-moss dark:text-glow" size={18} />
            Voice Collections
          </h3>

          <form onSubmit={handleCreateCollection} className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g. Work Calls, Social Presets"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              className="flex-1 rounded-md border border-ink/15 bg-white px-3 py-1.5 text-sm dark:border-border dark:bg-black dark:text-neutral-100"
            />
            <button type="submit" className="rounded-md bg-moss px-4 py-1.5 text-sm font-bold text-white hover:bg-moss/90 dark:bg-glow dark:text-black">
              Create Folder
            </button>
          </form>

          <div className="space-y-4 mt-4">
            {collections.length === 0 ? (
              <p className="text-sm text-ink/50 dark:text-muted py-2">No voice collections folders created yet.</p>
            ) : (
              collections.map(col => (
                <div key={col.id} className="rounded-md border border-ink/10 bg-cloud p-4 dark:border-border dark:bg-black space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-ink dark:text-neutral-200">{col.name}</span>
                    <button 
                      onClick={() => handleDeleteCollection(col.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Voices in collection */}
                  <div className="space-y-1">
                    {col.voiceIds.length === 0 ? (
                      <p className="text-xs text-ink/40 dark:text-neutral-500 italic">No voice profiles added yet.</p>
                    ) : (
                      col.voiceIds.map(vId => {
                        const profile = profiles.find(p => p.voice_id === vId);
                        return (
                          <div key={vId} className="flex justify-between items-center text-xs bg-white border border-ink/5 rounded px-2 py-1 dark:bg-surface dark:border-border">
                            <span>{profile?.name || vId}</span>
                            <button 
                              onClick={() => handleRemoveVoiceFromCol(col.id, vId)}
                              className="text-ink/40 hover:text-ink/80 dark:text-neutral-400"
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add voice select dropdown */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddVoiceToCol(col.id, e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="w-full text-xs rounded border border-ink/15 bg-white p-1 dark:border-border dark:bg-surface"
                  >
                    <option value="">+ Add voice to folder</option>
                    {profiles.map(p => (
                      <option key={p.voice_id} value={p.voice_id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: ONNX Inference Platform mockup */}
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 dark:text-neutral-100">
            <Cpu className="text-moss dark:text-glow" size={18} />
            ONNX AI Inference Engine (Phase 16)
          </h3>
          <p className="text-sm text-ink/65 dark:text-muted leading-relaxed">
            Expose local browser-based neural speech synthesis weights. Accelerate speech tasks without calling the network.
          </p>

          <div className="rounded-md border border-ink/10 bg-cloud p-4 dark:border-border dark:bg-black text-center space-y-2">
            <span className="text-xs font-semibold text-ink/50 dark:text-neutral-400 uppercase tracking-widest block">Status</span>
            <span className={`text-base font-bold block ${onnxLoaded ? "text-moss dark:text-glow" : "text-ink/60 dark:text-muted"}`}>
              {onnxLoaded ? "Local Model Active" : "No Weights Loaded"}
            </span>
          </div>

          <button
            onClick={handleLoadOnnx}
            disabled={onnxLoading || onnxLoaded}
            className="w-full rounded-md bg-moss text-white font-bold py-2 text-sm hover:bg-moss/95 disabled:opacity-50 dark:bg-glow dark:text-black"
          >
            {onnxLoading ? "Loading model weights (12MB)..." : onnxLoaded ? "Weights cached locally" : "Load Local tiny-vocoder model"}
          </button>
        </div>
      </div>
    </div>
  );
}
