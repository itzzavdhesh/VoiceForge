## Description
This PR implements a dedicated multilingual voice selection system that unlocks all 29 languages supported by the `eleven_multilingual_v2` model in VoiceForge.

## Key Changes
- **Unified Language Configuration**: Created a centralized language registry for both the frontend and backend to support all 29 languages with flags, localized names, and regions.
- **Premium Language Selector**: Built a highly interactive, searchable `LanguageSelector` React component with region grouping, dark mode support, and an "Auto-detect" option.
- **Frontend Integration**: Replaced the legacy hardcoded `<select>` dropdowns across the Call, Compose, and Settings pages with the new centralized component.
- **Backend Validation**: The `voiceController.js` server now strictly validates the `language_code` to ensure unsupported codes are immediately rejected.
- **Storage Migration**: Automatically migrates the legacy storage keys to a unified `voiceforge:language` state.

## Testing
- Verified language persistence across Call, Compose, and Settings pages.
- Verified auto-detect behavior triggers properly without crashing the server payload.
- Verified backend rejects invalid language configurations with a 400 response.
