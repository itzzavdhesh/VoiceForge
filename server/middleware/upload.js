// Configures Multer for in-memory reference audio uploads sent to ElevenLabs.
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024
  },
  fileFilter: (_request, file, callback) => {
    if (!file.mimetype.startsWith("audio/")) {
      callback(new Error("Please upload an audio recording."));
      return;
    }
    callback(null, true);
  }
});

export default upload;
