import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

/**
 * Handles face detection and cropping using MediaPipe.
 */
export class FaceProcessor {
  constructor() {
    this.faceLandmarker = null;
    this.isInitialized = false;
  }

  /**
   * Loads the MediaPipe FaceLandmarker model.
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Create the vision task
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
      );
      
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: false,
        runningMode: "VIDEO",
        numFaces: 1
      });

      this.isInitialized = true;
      console.log("FaceLandmarker initialized successfully");
    } catch (error) {
      console.error("Failed to initialize FaceLandmarker:", error);
    }
  }

  /**
   * Detects face landmarks in a video frame.
   * @param {HTMLVideoElement} videoElement The source video
   * @param {number} timestamp Current timestamp for video processing
   * @returns {Object|null} Landmark data or null if not detected
   */
  detectFace(videoElement, timestamp) {
    if (!this.isInitialized || !this.faceLandmarker) return null;

    try {
      const results = this.faceLandmarker.detectForVideo(videoElement, timestamp);
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        return results.faceLandmarks[0];
      }
    } catch (error) {
      console.error("Face detection error:", error);
    }
    return null;
  }

  /**
   * Crops the face from the source canvas, resizes to 96x96 on the target canvas,
   * and builds a [1, 6, 96, 96] Float32Array tensor for Wav2Lip ONNX.
   * Channels 0,1,2 = Target Face RGB.
   * Channels 3,4,5 = Masked Target Face RGB (lower half is 0).
   * 
   * @param {HTMLCanvasElement} sourceCanvas The canvas containing the full frame
   * @param {Array} landmarks The detected face landmarks
   * @param {HTMLCanvasElement} targetCanvas The canvas to draw the crop onto
   * @returns {Object|null} { tensorData: Float32Array, box: { x, y, w, h } }
   */
  cropMouthRegion(sourceCanvas, landmarks, targetCanvas) {
    if (!landmarks || landmarks.length === 0) return null;

    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (const p of landmarks) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const sw = sourceCanvas.width;
    const sh = sourceCanvas.height;

    let boxX = minX * sw;
    let boxY = minY * sh;
    let boxW = (maxX - minX) * sw;
    let boxH = (maxY - minY) * sh;

    // Expand bounding box slightly for context (Wav2Lip needs context)
    const expand = 0.2;
    boxX = Math.max(0, boxX - boxW * expand);
    boxY = Math.max(0, boxY - boxH * expand);
    boxW = Math.min(sw - boxX, boxW * (1 + 2 * expand));
    boxH = Math.min(sh - boxY, boxH * (1 + 2 * expand));

    // Force square
    const side = Math.max(boxW, boxH);
    boxX = boxX - (side - boxW) / 2;
    boxY = boxY - (side - boxH) / 2;
    
    // Draw onto 96x96 target canvas
    targetCanvas.width = 96;
    targetCanvas.height = 96;
    const ctx = targetCanvas.getContext("2d", { willReadFrequently: true });
    
    // Smooth scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    
    ctx.clearRect(0, 0, 96, 96);
    ctx.drawImage(sourceCanvas, boxX, boxY, side, side, 0, 0, 96, 96);

    const imgData = ctx.getImageData(0, 0, 96, 96);
    const data = imgData.data;

    // Create [1, 6, 96, 96] tensor. 
    // Float32Array size = 6 * 96 * 96 = 55296
    const tensorData = new Float32Array(55296);

    for (let y = 0; y < 96; y++) {
      for (let x = 0; x < 96; x++) {
        const pixelIdx = (y * 96 + x) * 4;
        const r = data[pixelIdx] / 255.0;
        const g = data[pixelIdx + 1] / 255.0;
        const b = data[pixelIdx + 2] / 255.0;

        // original face (channels 0, 1, 2)
        // planar layout: c * H * W + y * W + x
        const baseIdx0 = 0 * 96 * 96 + y * 96 + x;
        const baseIdx1 = 1 * 96 * 96 + y * 96 + x;
        const baseIdx2 = 2 * 96 * 96 + y * 96 + x;
        tensorData[baseIdx0] = r;
        tensorData[baseIdx1] = g;
        tensorData[baseIdx2] = b;

        // masked face (channels 3, 4, 5)
        const maskedR = y >= 48 ? 0 : r;
        const maskedG = y >= 48 ? 0 : g;
        const maskedB = y >= 48 ? 0 : b;

        const baseIdx3 = 3 * 96 * 96 + y * 96 + x;
        const baseIdx4 = 4 * 96 * 96 + y * 96 + x;
        const baseIdx5 = 5 * 96 * 96 + y * 96 + x;
        tensorData[baseIdx3] = maskedR;
        tensorData[baseIdx4] = maskedG;
        tensorData[baseIdx5] = maskedB;
      }
    }

    return {
      tensorData,
      box: { x: boxX, y: boxY, w: side, h: side }
    };
  }
  /**
   * Cleans up resources and closes the FaceLandmarker.
   */
  dispose() {
    if (this.faceLandmarker) {
      this.faceLandmarker.close();
      this.faceLandmarker = null;
    }
    this.isInitialized = false;
  }
}
