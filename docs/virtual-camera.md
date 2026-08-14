# VoiceForge Virtual Camera Guide

This guide covers step-by-step instructions for configuring VoiceForge with OBS Virtual Camera and integrating it with popular platforms like Discord and Webex. It also includes troubleshooting tips for common virtual camera issues.

---

## 📸 1. Setting Up OBS Virtual Camera (General)

1. **Install OBS Studio**: Download and install [OBS Studio](https://obsproject.com/).
2. **Add Browser Source**: In OBS, add a new **Browser Source** and point it to the VoiceForge URL (e.g., `http://localhost:5173`).
3. **Crop Output**: Hold `Alt` (or `Option` on macOS) and drag the edges of the Browser Source in the OBS preview window to crop the feed so only the lip-synced face preview is visible.
4. **Start Virtual Camera**: Click the **Start Virtual Camera** button in the bottom right corner of OBS.

---

## 🎮 2. Discord Setup Guide

1. Open Discord and go to **User Settings** (the gear icon near your profile name).
2. Navigate to **Voice & Video** under the App Settings section.
3. Scroll down to **Video Settings**.
4. In the **Camera** dropdown menu, select **OBS Virtual Camera**.
5. Click **Test Video** to preview your camera feed. You should see the cropped VoiceForge face preview.

*(Screenshot placeholder: Discord Voice & Video settings showing OBS Virtual Camera selected)*

---

## 💼 3. Webex Setup Guide

1. Open Webex and join or start a meeting.
2. Before joining, or while in the meeting, click on the **Video options** (the small arrow next to the Start Video icon).
3. Select **OBS Virtual Camera** from the list of available cameras.
4. If your video preview appears mirrored (which is common in Webex), click on **Video Settings...** and toggle the **Mirror my video** option.

*(Screenshot placeholder: Webex camera picker showing OBS Virtual Camera)*

---

## 🛠️ 4. Troubleshooting Common OBS Issues

### Issue: Virtual camera not detected
- **Solution**: Make sure you have clicked **Start Virtual Camera** in OBS Studio. Sometimes, restarting the video conferencing app (Discord, Webex, Zoom) is required after starting the virtual camera for the first time.

### Issue: Mirrored video
- **Solution**: Many platforms mirror your camera locally for your convenience, but others see it normally. If you need to fix it:
  - **In App**: Check the video settings of Discord/Webex/Zoom for a "Mirror my video" toggle.
  - **In OBS**: Right-click the Browser Source in OBS > **Transform** > **Flip Horizontal**.

### Issue: Aspect ratio and cropping issues
- **Solution**: VoiceForge is best viewed when cropped closely to the face. If the screen has black bars:
  - In OBS, right-click the Browser Source > **Transform** > **Edit Transform...** and adjust the crop settings manually.
  - Alternatively, hold `Alt` (or `Option` on Mac) and drag the red borders in the preview window to crop out the UI.
  - Ensure the OBS Base (Canvas) Resolution matches your desired output (e.g., 1920x1080) in Settings > Video.

### Issue: Black screen or frozen camera feed
- **Solution**: 
  - Verify that the Browser Source URL is correct and VoiceForge is running (`npm run dev`).
  - Double-click the Browser Source in OBS and click **Refresh cache of current page**.
  - Check if the camera feed is active on the VoiceForge browser tab.
