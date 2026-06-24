// Provides a Promise-based API utility for retrieving and managing voice profiles from the server.

export async function getAllProfiles() {
  try {
    const response = await fetch("/api/voice/profiles");
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    const profiles = await response.json();
    return profiles;
  } catch (err) {
    console.error("Failed to fetch profiles from server:", err);
    return [];
  }
}

export async function getProfile(voiceId) {
  if (!voiceId) return null;
  const profiles = await getAllProfiles();
  return profiles.find(p => p.voice_id === voiceId) || null;
}

export async function saveProfile(profile) {
  // Profiles are automatically persisted to the server via the /api/voice/clone 
  // POST request, so this function simply returns the newly created profile metadata.
  return profile;
}

export async function deleteProfile(voiceId) {
  try {
    const response = await fetch(`/api/voice/profiles/${voiceId}`, {
      method: "DELETE"
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server returned ${response.status}`);
    }
    return true;
  } catch (err) {
    console.error(`Failed to delete profile ${voiceId}:`, err);
    throw new Error("Failed to delete profile: " + (err.message || String(err)));
  }
}

