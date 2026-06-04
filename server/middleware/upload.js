// Configures Multer for in-memory reference audio uploads sent to ElevenLabs.
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024
  },
  fileFilter: async (_request, file, callback) => {
    if (!file.mimetype.startsWith("audio/")) {
      callback(new Error("Please upload an audio recording."));
      return;
    }

    try {
      const detectedType = await fileTypeFromBuffer(file.buffer);
      if (!detectedType || !detectedType.mime.startsWith("audio/")) {
        callback(new Error("Uploaded file is not a valid audio recording. The file contents do not match an audio format."));
        return;
      }
      callback(null, true);
    } catch (error) {
      callback(new Error("Failed to validate file type: " + error.message));
    }
  }
});

export default upload;
