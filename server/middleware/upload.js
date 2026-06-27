// Configures Multer for in-memory reference audio uploads used by the Chatterbox voice cloning flow.
import multer from "multer";

const ALLOWED_MIME_TYPES = [
  "audio/webm",
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/flac"
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
    files: 1,
    fields: 5,
    parts: 6
  },
  fileFilter: (_request, file, callback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new Error(
          "Invalid audio format. Allowed types: webm, wav, mp3, mp4, ogg, flac."
        )
      );
      return;
    }
    callback(null, true);
  }
});

export default upload;