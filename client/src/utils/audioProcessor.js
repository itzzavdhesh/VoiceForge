import Meyda from "meyda";
import { PitchShifter } from "./pitchShifter.js";

/**
 * Extracts Mel-spectrogram features from an HTMLMediaElement using the Web Audio API.
 * This is a simplified wrapper for real-time inference.
 */
export class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.source = null;
    this.analyzer = null;
    this.analyser = null; // AnalyserNode for audio visualization
    this.currentMelSpectrogram = null;
    this.currentVolume = 0;
    this.bassFilter = null;
    this.midFilter = null;
    this.trebleFilter = null;
    this.pitchShifter = null;
  }

  /**
   * Initializes the audio processor with a given audio element.
   * @param {HTMLMediaElement} audioElement The <audio> or <video> element to analyze.
   */
  async initialize(audioElement) {
    if (!this.audioContext) {
      // Must be created after a user gesture
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    // Prevent re-creating the source node if it already exists for this element
    if (!audioElement.dataset.sourceCreated) {
      this.source = this.audioContext.createMediaElementSource(audioElement);
      audioElement.dataset.sourceCreated = "true";
    }

    // Clean up old analyser node and connections
    if (this.analyser) {
      try {
        this.source.disconnect(this.analyser);
      } catch (e) {}
      this.analyser.disconnect();
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 32; // Yields 16 frequency bands

    // Clean up old direct connections to destination
    try {
      this.source.disconnect(this.audioContext.destination);
    } catch (e) {}

    // Create filters and pitch shifter
    this.bassFilter = this.audioContext.createBiquadFilter();
    this.bassFilter.type = "lowshelf";
    this.bassFilter.frequency.value = 200;

    this.midFilter = this.audioContext.createBiquadFilter();
    this.midFilter.type = "peaking";
    this.midFilter.frequency.value = 1000;
    this.midFilter.Q.value = 1.0;

    this.trebleFilter = this.audioContext.createBiquadFilter();
    this.trebleFilter.type = "highshelf";
    this.trebleFilter.frequency.value = 4000;

    this.pitchShifter = new PitchShifter(this.audioContext);

    // Apply saved configurations
    try {
      const saved = JSON.parse(localStorage.getItem("voiceforge:voiceSettings")) || {};
      this.bassFilter.gain.value = typeof saved.dspBass === "number" ? saved.dspBass : 0;
      this.midFilter.gain.value = typeof saved.dspMid === "number" ? saved.dspMid : 0;
      this.trebleFilter.gain.value = typeof saved.dspTreble === "number" ? saved.dspTreble : 0;
      this.pitchShifter.setPitch(typeof saved.dspPitch === "number" ? saved.dspPitch : 1.0);
      if (typeof saved.dspSpeed === "number") {
        audioElement.playbackRate = saved.dspSpeed;
      }
    } catch (e) {
      console.warn("Failed to load initial voice modifier values:", e);
    }

    // Connect DSP chain:
    // source -> analyser
    // source -> bass -> mid -> treble -> pitchShifter.input
    // pitchShifter.output -> destination
    this.source.connect(this.analyser);
    this.source.connect(this.bassFilter);
    this.bassFilter.connect(this.midFilter);
    this.midFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.pitchShifter.input);
    this.pitchShifter.output.connect(this.audioContext.destination);

    if (this.analyzer) {
      this.analyzer.stop();
    }

    // Configure Meyda to extract the melSpectrogram
    // Typical Wav2Lip uses specific mel bands and FFT sizes,
    // this will need tuning to match the exact ONNX model requirements.
    this.analyzer = Meyda.createMeydaAnalyzer({
      audioContext: this.audioContext,
      source: this.source,
      bufferSize: 512, // Must be a power of 2
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
   * Cleans up audio context and analyzer.
   */
  dispose() {
    if (this.analyzer) {
      this.analyzer.stop();
      this.analyzer = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.bassFilter) {
      this.bassFilter.disconnect();
      this.bassFilter = null;
    }
    if (this.midFilter) {
      this.midFilter.disconnect();
      this.midFilter = null;
    }
    if (this.trebleFilter) {
      this.trebleFilter.disconnect();
      this.trebleFilter = null;
    }
    if (this.pitchShifter) {
      if (this.pitchShifter.input) this.pitchShifter.input.disconnect();
      if (this.pitchShifter.output) this.pitchShifter.output.disconnect();
      this.pitchShifter = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }
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
