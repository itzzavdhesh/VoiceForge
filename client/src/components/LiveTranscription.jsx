import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle, Trash2 } from "lucide-react";

export default function LiveTranscription() {
  const [isListening, setIsListening] = useState(false);
  const [history, setHistory] = useState([]);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState("");
  
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);
  const isListeningRef = useRef(isListening);
  const isExpectedStopRef = useRef(false);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, interimText]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser (use Chrome or Edge).");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = document.documentElement.lang || "en-US";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let currentInterim = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setHistory((prev) => [...prev, finalTranscript.trim()]);
      }
      setInterimText(currentInterim);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        setError("Microphone permission denied.");
        setIsListening(false);
      } else if (event.error !== 'no-speech') {
        setError(`Transcription error: ${event.error}`);
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (!isExpectedStopRef.current && isListeningRef.current) {
        // Auto-restart if stopped due to silence or network blip
        try {
          recognitionRef.current?.start();
        } catch (e) {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isExpectedStopRef.current = true;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (error && error.includes("not supported")) return;
    
    setError("");
    if (isListening) {
      isExpectedStopRef.current = true;
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      isExpectedStopRef.current = false;
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start recognition:", err);
      }
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setInterimText("");
  };

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:shadow-soft-dk flex flex-col h-[300px]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isListening ? (
            <Mic size={18} className="text-coral animate-pulse" />
          ) : (
            <MicOff size={18} className="text-moss dark:text-glow" />
          )}
          <h2 className="text-lg font-bold dark:text-neutral-100">
            Live Transcription
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearHistory}
            disabled={history.length === 0 && !interimText}
            className="p-1.5 rounded-md border border-ink/10 text-ink/60 hover:bg-cloud hover:text-ink disabled:opacity-30 transition dark:border-border dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            title="Clear transcript"
          >
            <Trash2 size={16} />
          </button>
          <button
            type="button"
            onClick={toggleListening}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
              isListening 
                ? "bg-coral text-white hover:bg-coral/90" 
                : "bg-mint text-ink hover:bg-mint/80 dark:bg-glow/20 dark:text-glow dark:hover:bg-glow/30"
            }`}
          >
            {isListening ? "Stop" : "Listen"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 p-3 text-sm text-coral bg-coral/10 rounded-md border border-coral/30">
          <AlertCircle size={16} className="shrink-0" />
          <p>{error}</p>
        </div>
      ) : (
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-cloud dark:bg-black rounded-md p-4 border border-ink/5 dark:border-border/50 font-medium"
        >
          {history.length === 0 && !interimText && !isListening && (
            <p className="text-ink/40 dark:text-neutral-500 text-sm text-center mt-4">
              Click Listen to start transcribing room audio.
            </p>
          )}
          
          <div className="space-y-3">
            {history.map((text, i) => (
              <p key={i} className="text-ink dark:text-neutral-200">
                {text}
              </p>
            ))}
            
            {interimText && (
              <p className="text-ink/60 dark:text-neutral-400 italic">
                {interimText}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
