// Provides a lightweight, Promise-based IndexedDB utility for storing voice profiles and reference audio Blobs.

const DB_NAME = "voiceforge_db";
const STORE_NAME = "profiles";
const DB_VERSION = 1;

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

export async function clearStorage() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = (event) => {
      reject(new Error("Failed to clear storage: " + (event.target.error?.message || "Unknown error")));
    };
  });
}
