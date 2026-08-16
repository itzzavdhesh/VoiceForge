import Meyda from "meyda";
import { PitchShifter } from "./pitchShifter.js";

/**
 * Remembers which MediaElementAudioSourceNode belongs to which media element,
 * together with the AudioContext that created it.
 *
 * The Web Audio spec allows only one source node per media element, and that
 * node is permanently bound to its context. Keeping the binding in a WeakMap
 * rather than as a property on the DOM node means two AudioProcessor instances
 * can no longer clobber each other's state, and the entry disappears on its own
 * once the element is garbage collected.
 *
 * @type {WeakMap<HTMLMediaElement, { context: AudioContext, node: MediaElementAudioSourceNode }>}
 */
const mediaElementSources = new WeakMap();

/**
 * Extracts Mel-spectrogram features from an HTMLMediaElement using the Web Audio API.
 * Tracks a history of mel-spectrograms for Wav2Lip ONNX real-time inference.
 */
export class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.source = null;
    this.analyzer = null;
    this.analyser = null; // AnalyserNode for audio visualization
    this.currentMelSpectrogram = null;
    this.melHistory = [];
    this.currentVolume = 0;
    this.bassFilter = null;
    this.midFilter = null;
    this.trebleFilter = null;
    this.pitchShifter = null;
    this.mediaElement = null;
  }

  /**
   * Initializes the audio processor with a given audio element.
   * @param {HTMLMediaElement} audioElement The <audio> or <video> element to analyze.
   */
  async initialize(audioElement) {
    if (!audioElement) {
      throw new TypeError("AudioProcessor.initialize() requires a media element.");
    }

    const existingBinding = mediaElementSources.get(audioElement);

    if (existingBinding) {
      // This element is already bound to a context for the lifetime of the page.
      // Adopt that context instead of opening a second one — mixing nodes across
      // contexts is what corrupted state when the component remounted.
      this.audioContext = existingBinding.context;
    } else if (!this.audioContext) {
      // Must be created after a user gesture
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    if (this.analyzer) {
      this.analyzer.stop();
      this.analyzer = null;
    }

    // Clean up the previous source node connection to prevent a memory leak,
    // unless it is the very node we are about to reuse for this element.
    if (this.source && this.source !== existingBinding?.node) {
      this.source.disconnect();
    }
    this.source = null;

    if (existingBinding) {
      this.source = existingBinding.node;
    } else {
      this.source = this.audioContext.createMediaElementSource(audioElement);
      mediaElementSources.set(audioElement, {
        context: this.audioContext,
        node: this.source,
      });
    }

    // Always (re)connect to the destination. A reused node was disconnected by an
    // earlier initialize() or dispose(), which is what silenced playback on the
    // second mount. Reconnecting an already-connected pair is a no-op.
    this.source.connect(this.audioContext.destination);
    this.mediaElement = audioElement;

    // Reset history when initialized/re-initialized
    this.melHistory = [];

    // Configure Meyda to extract the melSpectrogram with 80 bands
    try {
      this.analyzer = Meyda.createMeydaAnalyzer({
        audioContext: this.audioContext,
        source: this.source,
        bufferSize: 512, // Must be a power of 2
        featureExtractors: ["melSpectrogram", "rms"],
        callback: (features) => {
          if (features) {
            if (features.melSpectrogram) {
              this.currentMelSpectrogram = features.melSpectrogram;
              if (!this.melHistory) this.melHistory = [];
              this.melHistory.push(features.melSpectrogram);
              if (this.melHistory.length > 16) {
                this.melHistory.shift();
              }
            }
            if (features.rms !== undefined) {
              this.currentVolume = features.rms;
            }
          }
        },
      });

      this.analyzer.start();
    } catch (err) {
      // Meyda initialization fallback
    }
  }

  /**
   * Returns real-time frequency data mapped to 5 frequency bands.
   * @returns {Uint8Array} Array of 5 frequency levels (0-255).
   */
  getFrequencyData() {
    if (!this.analyser) {
      return new Uint8Array(5).fill(0);
    }
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    const bars = new Uint8Array(5);
    const step = Math.floor(bufferLength / 5) || 1;
    for (let i = 0; i < 5; i++) {
      bars[i] = dataArray[i * step] || 0;
    }
    return bars;
  }

  /**
   * Returns the most recently extracted mel-spectrogram.
   * Format expected by Wav2Lip ONNX is usually [1, 1, 80, 16] 
   * which flattens to a Float32Array of length 1280.
   * @returns {Float32Array|null}
   */
  getLatestFeatures() {
    const history = this.melHistory || [];
    const flat = new Float32Array(80 * 16);

    // Fill the flat array in shape [1, 1, 80, 16] where time step changes fastest.
    // Flat index = b * 16 + t
    const missing = 16 - history.length;
    for (let b = 0; b < 80; b++) {
      for (let t = 0; t < 16; t++) {
        if (t >= missing) {
          const frame = history[t - missing];
          flat[b * 16 + t] = frame[b] || 0;
        } else {
          flat[b * 16 + t] = 0;
        }
      }
    }
    return flat;
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
   * Cleans up audio context and analyzer.
   */
  dispose() {
    if (this.analyzer) {
      this.analyzer.stop();
      this.analyzer = null;
    }
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {
        /* ignore disconnect errors */
      }
      this.source = null;
    }
    // A media element can never be bound to a second source node, so closing the
    // context that owns its binding would silence that element permanently. Keep
    // such a context alive — the WeakMap entry, and with it the context, is
    // released once the element itself is garbage collected.
    const ownsMediaBinding =
      this.mediaElement &&
      mediaElementSources.get(this.mediaElement)?.context === this.audioContext;

    if (!ownsMediaBinding && this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
    }

    this.mediaElement = null;
    this.audioContext = null;
    this.melHistory = [];
  }

  setBass(gain) {
    if (this.bassFilter) {
      this.bassFilter.gain.value = gain;
    }
  }

  setMid(gain) {
    if (this.midFilter) {
      this.midFilter.gain.value = gain;
    }
  }

  setTreble(gain) {
    if (this.trebleFilter) {
      this.trebleFilter.gain.value = gain;
    }
  }

  setPitch(pitch) {
    if (this.pitchShifter) {
      this.pitchShifter.setPitch(pitch);
    }
  }

  setSpeed(speed, audioElement) {
    if (audioElement) {
      audioElement.playbackRate = speed;
    }
  }
}
