import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { X, Copy, Camera, CheckCircle2 } from "lucide-react";
import { receiveDataInChunks } from "../utils/webrtc.js";
import { saveVoiceProfile } from "../hooks/useVoiceClone.js";

export function ReceiveProfileModal({ onClose, onSuccess }) {
  const [step, setStep] = useState("waiting_for_offer");
  const [offerText, setOfferText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [error, setError] = useState("");
  const pcRef = useRef(null);
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  useEffect(() => {
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.releaseAllStreams();
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  const processOffer = async (encodedOffer) => {
    try {
      setStep("generating_answer");
      const decoded = atob(encodedOffer);
      const offer = JSON.parse(decoded);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      pcRef.current = pc;

      pc.ondatachannel = (event) => {
        const dc = event.channel;
        setStep("receiving");
        receiveDataInChunks(dc, async (payload) => {
          try {
            // Restore blob
            let audioBlob = null;
            if (payload.audioDataUrl) {
              const arr = payload.audioDataUrl.split(",");
              const mime = arr[0].match(/:(.*?);/)?.[1] || "audio/webm";
              const bstr = atob(arr[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
              }
              audioBlob = new Blob([u8arr], { type: mime });
            }
            
            await saveVoiceProfile({
              voice_id: payload.voice_id + "-received-" + Date.now().toString().slice(-4),
              name: payload.name + " (Shared)",
            }, audioBlob);

            setStep("done");
            if (onSuccess) onSuccess();
          } catch (err) {
            setError("Failed to save profile: " + err.message);
          }
        });
      };

      pc.onicecandidate = (e) => {
        if (e.candidate === null) {
          const answer = JSON.stringify(pc.localDescription);
          setAnswerText(btoa(answer));
          setStep("waiting_for_sender");
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

    } catch (err) {
      setError("Invalid offer format: " + err.message);
      setStep("waiting_for_offer");
    }
  };

  const handlePasteOffer = (e) => {
    const val = e.target.value.trim();
    setOfferText(val);
    if (val) processOffer(val);
  };

  const startScanner = async () => {
    setStep("scanning_offer");
    try {
      codeReaderRef.current = new BrowserQRCodeReader();
      codeReaderRef.current.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
        if (result) {
          codeReaderRef.current.releaseAllStreams();
          processOffer(result.getText());
        }
      });
    } catch (err) {
      setError("Camera error: " + err.message);
      setStep("waiting_for_offer");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(answerText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl dark:bg-surface dark:text-neutral-100">
        <div className="flex items-center justify-between border-b border-ink/10 p-4 dark:border-border">
          <h2 className="text-xl font-bold">Receive Voice Profile</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-ink/10 dark:hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-md bg-coral/10 p-3 text-sm text-coral">
              {error}
            </div>
          )}

          {step === "waiting_for_offer" && (
            <div className="flex flex-col items-center">
              <p className="text-sm text-center mb-4 text-ink/70 dark:text-muted">
                1. Scan the sender's code or paste their link here.
              </p>
              <div className="flex gap-2 w-full mb-6">
                <button
                  onClick={startScanner}
                  className="flex flex-1 items-center justify-center gap-2 rounded bg-ink/5 py-2 text-sm font-bold hover:bg-ink/10 dark:bg-white/10 dark:hover:bg-white/20"
                >
                  <Camera size={16} /> Scan Offer
                </button>
                <input 
                  type="text" 
                  placeholder="Or paste offer here"
                  value={offerText}
                  onChange={handlePasteOffer}
                  className="flex-1 rounded border border-ink/20 px-3 py-2 text-sm dark:border-border dark:bg-black/50"
                />
              </div>
            </div>
          )}

          {step === "scanning_offer" && (
            <div className="flex flex-col items-center">
              <video ref={videoRef} className="w-full max-w-sm rounded-lg bg-black object-cover aspect-square" />
              <button 
                onClick={() => {
                  codeReaderRef.current?.releaseAllStreams();
                  setStep("waiting_for_offer");
                }}
                className="mt-4 text-sm underline"
              >
                Cancel Scan
              </button>
            </div>
          )}

          {step === "generating_answer" && <div className="text-center py-8">Generating connection code...</div>}

          {step === "waiting_for_sender" && (
            <div className="flex flex-col items-center">
              <p className="text-sm text-center mb-4 text-ink/70 dark:text-muted">
                2. Show this answer code to the sender so they can scan it.
              </p>
              <div className="bg-white p-2 rounded-lg border">
                <QRCodeSVG value={answerText} size={200} />
              </div>
              <button 
                onClick={handleCopy}
                className="mt-4 flex items-center gap-2 text-sm font-bold text-moss hover:underline dark:text-glow"
              >
                <Copy size={16} /> Copy Answer Text
              </button>
              <p className="text-xs text-center mt-6 text-ink/50 dark:text-muted">
                Waiting for sender to connect...
              </p>
            </div>
          )}

          {step === "receiving" && <div className="text-center py-8">Receiving profile data...</div>}
          
          {step === "done" && (
            <div className="flex flex-col items-center py-8">
              <CheckCircle2 size={48} className="text-moss dark:text-glow mb-4" />
              <p className="font-bold text-lg">Profile Received!</p>
              <button onClick={onClose} className="mt-6 rounded bg-moss px-6 py-2 font-bold text-white hover:bg-moss/90 dark:bg-glow dark:text-black">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
