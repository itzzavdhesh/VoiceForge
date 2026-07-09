// Centralised API base URL for all backend requests.
// In development, Vite's proxy handles "/api" → localhost:3001 so the default
// empty string works fine. In production (or any environment where the frontend
// is served separately from the backend), set the VITE_API_BASE_URL env var to
// point at the backend origin (e.g. "http://localhost:3001").
//
// Usage:
//   import { API_BASE_URL } from "../utils/apiConfig.js";
//   fetch(`${API_BASE_URL}/api/voice/clone`, { … });

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ?? "";
