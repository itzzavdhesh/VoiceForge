// Provides a lightweight, Promise-based IndexedDB utility for storing voice profiles and reference audio Blobs.

const DB_NAME = "voiceforge_db";
const STORE_NAME = "profiles";
const TRANSCRIPT_STORE = "transcripts";
const SESSION_STORE = "sessions";
const COLLECTION_STORE = "collections";
const DB_VERSION = 2;

let dbPromise = null;

function getDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this browser environment."));
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        dbPromise = null; // reset so next call retries
        reject(new Error("Failed to open database: " + (event.target.error?.message || "Unknown error")));
      };

      request.onblocked = () => {
        dbPromise = null; // reset so next call retries
        reject(new Error("Database access is blocked. Please close other open tabs."));
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "voice_id" });
        }
        if (!db.objectStoreNames.contains(TRANSCRIPT_STORE)) {
          db.createObjectStore(TRANSCRIPT_STORE, { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(SESSION_STORE)) {
          db.createObjectStore(SESSION_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(COLLECTION_STORE)) {
          db.createObjectStore(COLLECTION_STORE, { keyPath: "id" });
        }
      };
    } catch (err) {
      dbPromise = null;
      reject(new Error("Failed to initialize IndexedDB: " + (err?.message || String(err))));
    }
  });

  return dbPromise;
}

export async function getAllProfiles() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort profiles in descending order of creation date
      const sorted = (request.result || []).sort((a, b) => {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
      resolve(sorted);
    };

    request.onerror = (event) => {
      reject(new Error("Failed to retrieve profiles: " + (event.target.error?.message || "Unknown error")));
    };
  });
}

export async function getProfile(voiceId) {
  if (!voiceId) return null;
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(voiceId);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = (event) => {
      reject(new Error("Failed to retrieve profile: " + (event.target.error?.message || "Unknown error")));
    };
  });
}

export async function saveProfile(profile) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(profile);

    request.onsuccess = () => {
      resolve(profile);
    };

    request.onerror = (event) => {
      reject(new Error("Failed to save profile: " + (event.target.error?.message || "Unknown error")));
    };
  });
}

export async function deleteProfile(voiceId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(voiceId);

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = (event) => {
      reject(new Error("Failed to delete profile: " + (event.target.error?.message || "Unknown error")));
    };
  });
}

// --- TRANSCRIPT CRUD ---
export async function getAllTranscripts() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRANSCRIPT_STORE, "readonly");
    const store = transaction.objectStore(TRANSCRIPT_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = (event) => reject(new Error("Failed to load transcripts: " + event.target.error?.message));
  });
}

export async function saveTranscript(transcript) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRANSCRIPT_STORE, "readwrite");
    const store = transaction.objectStore(TRANSCRIPT_STORE);
    const request = store.put({
      ...transcript,
      timestamp: transcript.timestamp || Date.now()
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(new Error("Failed to save transcript: " + event.target.error?.message));
  });
}

export async function deleteTranscript(id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRANSCRIPT_STORE, "readwrite");
    const store = transaction.objectStore(TRANSCRIPT_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(new Error("Failed to delete transcript: " + event.target.error?.message));
  });
}

// --- SESSION CRUD ---
export async function getAllSessions() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SESSION_STORE, "readonly");
    const store = transaction.objectStore(SESSION_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = (event) => reject(new Error("Failed to load sessions: " + event.target.error?.message));
  });
}

export async function saveSession(session) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SESSION_STORE, "readwrite");
    const store = transaction.objectStore(SESSION_STORE);
    const request = store.put(session);
    request.onsuccess = () => resolve(session);
    request.onerror = (event) => reject(new Error("Failed to save session: " + event.target.error?.message));
  });
}

export async function deleteSession(id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SESSION_STORE, "readwrite");
    const store = transaction.objectStore(SESSION_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(new Error("Failed to delete session: " + event.target.error?.message));
  });
}

// --- COLLECTIONS CRUD ---
export async function getAllCollections() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(COLLECTION_STORE, "readonly");
    const store = transaction.objectStore(COLLECTION_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = (event) => reject(new Error("Failed to load collections: " + event.target.error?.message));
  });
}

export async function saveCollection(collection) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(COLLECTION_STORE, "readwrite");
    const store = transaction.objectStore(COLLECTION_STORE);
    const request = store.put(collection);
    request.onsuccess = () => resolve(collection);
    request.onerror = (event) => reject(new Error("Failed to save collection: " + event.target.error?.message));
  });
}

export async function deleteCollection(id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(COLLECTION_STORE, "readwrite");
    const store = transaction.objectStore(COLLECTION_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(new Error("Failed to delete collection: " + event.target.error?.message));
  });
}

export async function clearAllTranscripts() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRANSCRIPT_STORE, "readwrite");
    const store = transaction.objectStore(TRANSCRIPT_STORE);
    const request = store.clear();
    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(new Error("Failed to clear transcripts: " + event.target.error?.message));
  });
}

// DB Recovery function (Phase 23)
export async function dbRecovery() {
  try {
    const db = await getDB();
    db.close();
    return new Promise((resolve) => {
      const request = window.indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => {
        dbPromise = null;
        resolve(true);
      };
      request.onerror = () => resolve(false);
      request.onblocked = () => resolve(false);
    });
  } catch {
    return false;
  }
}
