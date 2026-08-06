function safeStorageOperation(operation) {
  try {
    return operation();
  } catch {
    return null;
  }
}

export function getStoredValue(key, fallback = null) {
  const value = safeStorageOperation(() => localStorage.getItem(key));
  return value ?? fallback;
}

export function setStoredValue(key, value) {
  safeStorageOperation(() => localStorage.setItem(key, value));
}

export function removeStoredValue(key) {
  safeStorageOperation(() => localStorage.removeItem(key));
}
