import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, QrCode, Smartphone, Loader2 } from "lucide-react";
import {
  exportSetupPayload,
  generateTransferUrl,
} from "../utils/profileExport.js";

export function TransferSetupModal({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [transferUrl, setTransferUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function prepareTransfer() {
      try {
        setLoading(true);
        setError("");
        const compressed = await exportSetupPayload();
        const url = generateTransferUrl(compressed);
        setTransferUrl(url);
      } catch (err) {
        setError("Failed to generate transfer payload: " + (err.message || String(err)));
      } finally {
        setLoading(false);
      }
    }
    prepareTransfer();
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transferUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy transfer URL:", err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-md rounded-xl border border-ink/10 bg-white p-6 shadow-2xl dark:border-border dark:bg-surface dark:text-neutral-100">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close transfer modal"
          className="absolute right-4 top-4 rounded-md p-1.5 text-ink/60 transition hover:bg-neutral-100 hover:text-ink dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-moss/10 p-2.5 text-moss dark:bg-glow/20 dark:text-glow">
            <QrCode size={24} />
          </div>
          <div>
            <h2 id="transfer-modal-title" className="text-lg font-bold">
              Transfer to Another Device
            </h2>
            <p className="text-xs text-ink/60 dark:text-muted">
              Scan with a camera or copy the deep link
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 size={36} className="animate-spin text-moss dark:text-glow" />
              <p className="mt-3 text-sm font-medium text-ink/70 dark:text-muted">
                Packaging voice profiles &amp; settings... (100%)
              </p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-coral/30 bg-coral/10 p-4 text-sm text-coral">
              {error}
            </div>
          ) : (
            <>
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center rounded-lg border border-ink/10 bg-white p-4 shadow-inner dark:border-border dark:bg-black">
                <div className="rounded-md bg-white p-2">
                  <QRCodeSVG
                    value={transferUrl}
                    size={220}
                    level="M"
                    includeMargin
                  />
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-ink/60 dark:text-muted">
                  <Smartphone size={14} />
                  <span>Scan with your tablet or phone camera</span>
                </div>
              </div>

              {/* Copyable Deep Link */}
              <div>
                <label
                  htmlFor="transfer-link-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-ink/60 dark:text-muted mb-1.5"
                >
                  Shareable Deep Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="transfer-link-input"
                    type="text"
                    readOnly
                    value={transferUrl}
                    className="w-full truncate rounded-md border border-ink/15 bg-cloud px-3 py-2 text-xs font-mono text-ink/80 focus:outline-none dark:border-border dark:bg-black dark:text-neutral-200"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`inline-flex min-w-28 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition ${
                      copied
                        ? "bg-moss text-white dark:bg-glow dark:text-black"
                        : "bg-ink text-white hover:bg-ink/85 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check size={14} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>

              <p className="text-xs text-ink/55 dark:text-muted">
                🔒 <strong>Privacy First:</strong> Transfer data is encoded directly in the URL using URL-safe compression. No voice data or settings are ever sent to any remote server.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
