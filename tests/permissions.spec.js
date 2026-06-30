import { test, expect } from '@playwright/test';

test.describe('Hardware Permissions', () => {

  test('Should proceed to Call screen and show video when permissions are granted', async ({ context, page }) => {
    // Grant both camera and microphone permissions
    await context.grantPermissions(['camera', 'microphone']);

    await page.goto('/');

    // Navigate to the Call tab using the specific nav bar button
    await page.getByLabel('VoiceForge pages').getByRole('button', { name: 'Call' }).click();

    // Verify we are on the Call page by looking for specific heading
    const heading = page.getByRole('heading', { name: /Call control room/i });
    await expect(heading).toBeVisible();

    // Verify that the video element is present
    const videoElement = page.locator('video').first();
    await expect(videoElement).toBeVisible();

    // Ensure there is no camera error message
    await expect(page.getByText(/Camera access failed/i)).not.toBeVisible();
  });

  test('Should show error messages when permissions are denied', async ({ page }) => {
    // Mock the browser denying hardware access
    await page.addInitScript(() => {
      // Override getUserMedia to always reject with a permission denied error
      const mockGetUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = mockGetUserMedia;
      } else {
        navigator.mediaDevices = { getUserMedia: mockGetUserMedia };
      }
    });

    // Start on the main page (Onboarding)
    await page.goto('/');

    // Try to start recording (microphone)
    const recordBtn = page.getByRole('button', { name: /Start recording/i });
    await expect(recordBtn).toBeVisible();
    await recordBtn.click();

    // Verify microphone error appears
    await expect(page.getByText(/Microphone access denied/i)).toBeVisible();

    // Navigate to the Call tab (camera)
    await page.getByLabel('VoiceForge pages').getByRole('button', { name: 'Call' }).click();

    // Verify we reached the Call page
    const heading = page.getByRole('heading', { name: /Call control room/i });
    await expect(heading).toBeVisible();

    // Verify camera error appears
    await expect(page.getByText(/Camera access failed/i).first()).toBeVisible();
  });
});
