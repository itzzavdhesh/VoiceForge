// Voice settings utilities for VoiceForge

export const DEFAULT_VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true,
  speed: 1.0,
  language: 'en'
};

export function loadVoiceSettings() {
  try {
    const saved = localStorage.getItem('voiceforge_voice_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_VOICE_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load voice settings:', error);
  }
  return DEFAULT_VOICE_SETTINGS;
}

export function persistVoiceSettings(settings) {
  try {
    localStorage.setItem('voiceforge_voice_settings', JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save voice settings:', error);
  }
}

export function resetVoiceSettings() {
  try {
    localStorage.removeItem('voiceforge_voice_settings');
  } catch (error) {
    console.warn('Failed to reset voice settings:', error);
  }
  return DEFAULT_VOICE_SETTINGS;
}
