const ACCESS_KEY = "voiceforge_access_token";
const REFRESH_KEY = "voiceforge_refresh_token";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken, refreshToken) {
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isAuthenticated() {
  return !!getAccessToken();
}

export function logout() {
  clearTokens();
  window.dispatchEvent(new Event("voiceforge:unauthorized"));
}

let refreshPromise = null;

async function performTokenRefresh() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        logout();
        return null;
      }
      const refreshRes = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setTokens(data.accessToken, data.refreshToken);
        return data.accessToken;
      } else {
        logout();
        return null;
      }
    } catch (err) {
      console.error("Token refresh failed:", err);
      logout();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Custom fetch wrapper that automatically attaches the access token
 * and handles token refresh/rotation if it receives a 401 response.
 * Normalizes headers using standard Headers object to prevent 401 failures on custom instances.
 */
export async function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  options.headers = headers;

  let res = await fetch(url, options);

  if (res.status === 401) {
    const newAccessToken = await performTokenRefresh();
    if (newAccessToken) {
      const retryHeaders = new Headers(options.headers);
      retryHeaders.set("Authorization", `Bearer ${newAccessToken}`);
      options.headers = retryHeaders;
      res = await fetch(url, options);
    }
  }

  return res;
}
