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
   * A helper method to crop the lower half of the face (mouth region)
   * which is typically what Wav2Lip expects as input.
   * @param {HTMLCanvasElement} sourceCanvas The canvas containing the full frame
   * @param {Array} landmarks The detected face landmarks
   * @param {HTMLCanvasElement} targetCanvas The canvas to draw the crop onto
   * @returns {Object|null} The cropped image data and original crop coordinates
   */
  cropMouthRegion(sourceCanvas, landmarks, targetCanvas) {
    if (!landmarks || !sourceCanvas || !targetCanvas) return null;

    // Mouth landmarks indices in MediaPipe FaceMesh
    const MOUTH_LANDMARKS = [
      0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 83, 84, 87, 88, 91, 95, 96, 146,
      178, 181, 185, 191, 267, 269, 270, 291, 308, 310, 311, 312, 313, 314, 317, 318,
      321, 324, 326, 375, 402, 405, 409, 415
    ];

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const idx of MOUTH_LANDMARKS) {
      const lm = landmarks[idx];
      if (lm) {
        minX = Math.min(minX, lm.x);
        maxX = Math.max(maxX, lm.x);
        minY = Math.min(minY, lm.y);
        maxY = Math.max(maxY, lm.y);
      }
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const mouthWidth = maxX - minX;
    const mouthHeight = maxY - minY;

    // We want a square crop centered around the mouth
    const cropSize = Math.max(mouthWidth, mouthHeight) * 1.8;

    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;

    let w = Math.floor(cropSize * srcW);
    let h = Math.floor(cropSize * srcH);
    let x = Math.floor((centerX - cropSize / 2) * srcW);
    let y = Math.floor((centerY - cropSize / 2) * srcH);

    // Clamp coordinates to stay within canvas boundaries
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x + w > srcW) w = srcW - x;
    if (y + h > srcH) h = srcH - y;

    const ctx = targetCanvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.drawImage(
      sourceCanvas,
      x, y, w, h,
      0, 0, targetCanvas.width, targetCanvas.height
    );

    const imageData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
    return {
      imageData,
      coords: { x, y, w, h }
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
