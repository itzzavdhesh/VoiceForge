import Meyda from "meyda";

let sharedAudioContext = null;
const elementSourceMap = new WeakMap();

/**
 * Returns a shared singleton AudioContext to prevent HTMLMediaElement reconnect DOMExceptions.
 */
export function getSharedAudioContext() {
  if (typeof window === "undefined") return null;
  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      sharedAudioContext = new AudioCtx();
    }
  }
  return sharedAudioContext;
}

/**
 * Extracts Mel-spectrogram features from an HTMLMediaElement using the Web Audio API.
 * This is a simplified wrapper for real-time inference.
 */
export class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.source = null;
    this.analyzer = null;
    this.currentMelSpectrogram = null;
    this.currentVolume = 0;
  }

  /**
   * Initializes the audio processor with a given audio element.
   * @param {HTMLMediaElement} audioElement The <audio> or <video> element to analyze.
   */
  async initialize(audioElement) {
    if (!audioElement) return;

    this.audioContext = getSharedAudioContext();
    if (!this.audioContext) return;
    
    if (this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
      } catch {
        // Autoplay policy gesture requirement
      }
    }

    if (elementSourceMap.has(audioElement)) {
      this.source = elementSourceMap.get(audioElement);
    } else {
      try {
        this.source = this.audioContext.createMediaElementSource(audioElement);
        this.source.connect(this.audioContext.destination);
        elementSourceMap.set(audioElement, this.source);
        audioElement.dataset.sourceCreated = "true";
      } catch {
        if (elementSourceMap.has(audioElement)) {
          this.source = elementSourceMap.get(audioElement);
        }
      }
    }

    if (this.analyzer) {
      try {
        this.analyzer.stop();
      } catch {
        // Ignore analyzer stop error
      }
      this.analyzer = null;
    }

    if (this.source && Meyda && typeof Meyda.createMeydaAnalyzer === "function") {
      try {
        this.analyzer = Meyda.createMeydaAnalyzer({
          audioContext: this.audioContext,
          source: this.source,
          bufferSize: 512,
          featureExtractors: ["melSpectrogram", "rms"],
          callback: (features) => {
            if (features) {
              if (features.melSpectrogram) {
                this.currentMelSpectrogram = features.melSpectrogram;
              }
              if (features.rms !== undefined) {
                this.currentVolume = features.rms;
              }
            }
          },
        });
        this.analyzer.start();
      } catch {
        // Meyda initialization fallback
      }
    }
  }

  /**
   * Returns the most recently extracted mel-spectrogram.
   * Format expected by Wav2Lip ONNX is usually [batch_size, 1, 80, 16] (example).
   * @returns {Float32Array|null}
   */
  getLatestFeatures() {
    return this.currentMelSpectrogram;
  }

  /**
   * Returns the current RMS volume to drive fallback mouth animation.
   * @returns {number}
   */
  getVolume() {
    return this.currentVolume || 0;
  }

  /**
   * Returns the current time from the audio context for exact A/V synchronization.
   * @returns {number}
   */
  getAudioTime() {
    return this.audioContext ? this.audioContext.currentTime : 0;
  }

  /**
   * Cleans up Meyda analyzer without closing shared AudioContext.
   */
  dispose() {
    if (this.analyzer) {
      try {
        this.analyzer.stop();
      } catch {
        // Ignore
      }
      this.analyzer = null;
    }
    this.source = null;
    this.audioContext = null;
  }
}
