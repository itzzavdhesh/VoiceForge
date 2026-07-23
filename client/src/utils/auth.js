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

/**
 * Custom fetch wrapper that automatically attaches the access token
 * and handles token refresh/rotation if it receives a 401 response.
 */
export async function authFetch(url, options = {}) {
  options.headers = options.headers || {};
  const token = getAccessToken();
  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(url, options);

  if (res.status === 401) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken })
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setTokens(data.accessToken, data.refreshToken);
          
          // Retry the request with the newly rotated access token
          options.headers["Authorization"] = `Bearer ${data.accessToken}`;
          res = await fetch(url, options);
        } else {
          // Refresh token expired or invalid, trigger logout
          logout();
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
        logout();
      }
    } else {
      logout();
    }
  }

  return res;
}
