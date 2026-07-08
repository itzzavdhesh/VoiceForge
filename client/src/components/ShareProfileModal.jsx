import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { X, Copy, Camera, CheckCircle2 } from "lucide-react";
import { sendDataInChunks } from "../utils/webrtc.js";

export function ShareProfileModal({ profile, onClose }) {
  const [step, setStep] = useState("generating_offer");
  const [offerText, setOfferText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [error, setError] = useState("");
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  useEffect(() => {
    // Generate WebRTC Offer on mount
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    pcRef.current = pc;

    const dc = pc.createDataChannel("profileTransfer");
    dcRef.current = dc;

    dc.onopen = async () => {
      setStep("sending");
      try {
        let base64Audio = null;
        if (profile.audioBlob) {
          base64Audio = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(profile.audioBlob);
          });
        }
        
        const payload = {
          voice_id: profile.voice_id,
          name: profile.name,
          createdAt: profile.createdAt,
          audioDataUrl: base64Audio
        };

        await sendDataInChunks(dc, payload);
        setStep("done");
      } catch (err) {
        setError("Transfer failed: " + err.message);
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate === null) {
        // Gathering complete, encode the full local description
        const offer = JSON.stringify(pc.localDescription);
        const encoded = btoa(offer);
        setOfferText(encoded);
        setStep("waiting_for_answer");
      }
    };

    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(err => setError("Failed to create offer: " + err.message));

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.releaseAllStreams();
      }
      pc.close();
    };
  }, [profile]);

  const handleCopy = () => {
    navigator.clipboard.writeText(offerText);
  };

  const processAnswer = async (encodedAnswer) => {
    try {
      setStep("connecting");
      const decoded = atob(encodedAnswer);
      const answer = JSON.parse(decoded);
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      setError("Invalid answer format.");
      setStep("waiting_for_answer");
    }
  };

  const handlePasteAnswer = (e) => {
    const val = e.target.value.trim();
    setAnswerText(val);
    if (val) processAnswer(val);
  };

  const startScanner = async () => {
    setStep("scanning_answer");
    try {
      codeReaderRef.current = new BrowserQRCodeReader();
      codeReaderRef.current.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
        if (result) {
          codeReaderRef.current.releaseAllStreams();
          processAnswer(result.getText());
        }
      });
    } catch (err) {
      setError("Camera error: " + err.message);
      setStep("waiting_for_answer");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl dark:bg-surface dark:text-neutral-100">
        <div className="flex items-center justify-between border-b border-ink/10 p-4 dark:border-border">
          <h2 className="text-xl font-bold">Share Voice Profile</h2>
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

          {step === "generating_offer" && (
            <div className="text-center py-8">Generating secure sharing link...</div>
          )}

          {step === "waiting_for_answer" && (
            <div className="flex flex-col items-center">
              <p className="text-sm text-center mb-4 text-ink/70 dark:text-muted">
                1. Show this QR code to the receiver, or copy the link.
              </p>
              <div className="bg-white p-2 rounded-lg border">
                <QRCodeSVG value={offerText} size={200} />
              </div>
              <button 
                onClick={handleCopy}
                className="mt-4 flex items-center gap-2 text-sm font-bold text-moss hover:underline dark:text-glow"
              >
                <Copy size={16} /> Copy Code Text
              </button>
              
              <hr className="w-full my-6 border-ink/10 dark:border-border" />
              
              <p className="text-sm text-center mb-4 text-ink/70 dark:text-muted">
                2. After they scan it, they will give you an Answer Code.
              </p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={startScanner}
                  className="flex flex-1 items-center justify-center gap-2 rounded bg-ink/5 py-2 text-sm font-bold hover:bg-ink/10 dark:bg-white/10 dark:hover:bg-white/20"
                >
                  <Camera size={16} /> Scan Answer
                </button>
                <input 
                  type="text" 
                  placeholder="Or paste answer here"
                  value={answerText}
                  onChange={handlePasteAnswer}
                  className="flex-1 rounded border border-ink/20 px-3 py-2 text-sm dark:border-border dark:bg-black/50"
                />
              </div>
            </div>
          )}

          {step === "scanning_answer" && (
            <div className="flex flex-col items-center">
              <video ref={videoRef} className="w-full max-w-sm rounded-lg bg-black object-cover aspect-square" />
              <button 
                onClick={() => {
                  codeReaderRef.current?.releaseAllStreams();
                  setStep("waiting_for_answer");
                }}
                className="mt-4 text-sm underline"
              >
                Cancel Scan
              </button>
            </div>
          )}

          {step === "connecting" && <div className="text-center py-8">Connecting peer-to-peer...</div>}
          {step === "sending" && <div className="text-center py-8">Transferring profile securely...</div>}
          
          {step === "done" && (
            <div className="flex flex-col items-center py-8">
              <CheckCircle2 size={48} className="text-moss dark:text-glow mb-4" />
              <p className="font-bold text-lg">Transfer Complete!</p>
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
