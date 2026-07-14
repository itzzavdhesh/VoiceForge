import Meyda from "meyda";

/**
 * Extracts Mel-spectrogram features from an HTMLMediaElement using the Web Audio API.
 * This is a simplified wrapper for real-time inference.
 */
export class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.source = null;
    this.analyzer = null;
    this.melBuffer = []; // stores last 16 frames
    this.currentVolume = 0;
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
      // Connect to destination so we can still hear it
      this.source.connect(this.audioContext.destination);
      audioElement.dataset.sourceCreated = "true";
    }

    if (this.analyzer) {
      this.analyzer.stop();
    }

    // Configure Meyda for 80 mel bands
    Meyda.melBands = 80;

    this.analyzer = Meyda.createMeydaAnalyzer({
      audioContext: this.audioContext,
      source: this.source,
      bufferSize: 512, // Must be a power of 2
      featureExtractors: ["melBands", "rms"], // Using melBands for Wav2Lip
      callback: (features) => {
        if (features) {
          // Meyda returns melBands as an array/Float32Array
          const melData = features.melBands || features.melSpectrogram;
          if (melData) {
            // Push a copy to avoid mutation
            this.melBuffer.push(new Float32Array(melData));
            if (this.melBuffer.length > 16) {
              this.melBuffer.shift();
            }
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
   * Returns the most recently extracted mel-spectrogram.
   * Format expected by Wav2Lip ONNX is usually [1, 1, 80, 16] 
   * which flattens to a Float32Array of length 1280.
   * @returns {Float32Array|null}
   */
  getLatestFeatures() {
    if (this.melBuffer.length < 16) {
      return null; // Wait until we have enough frames
    }
    
    // Wav2Lip expects shape [batch_size, 1, 80, 16]
    // which in memory is 80 rows (mel bands), 16 columns (time frames).
    const tensorData = new Float32Array(80 * 16);
    
    for (let timeStep = 0; timeStep < 16; timeStep++) {
      const frameData = this.melBuffer[timeStep];
      for (let band = 0; band < 80; band++) {
        // Safe access in case Meyda returns less than 80 bands
        const val = band < frameData.length ? frameData[band] : 0;
        // Memory layout: [band * 16 + timeStep]
        tensorData[band * 16 + timeStep] = val;
      }
    }
    
    return tensorData;
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
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
