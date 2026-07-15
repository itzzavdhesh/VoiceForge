import { test, expect } from '@playwright/test';

test.describe('VoiceForge Speech Composer', () => {

  test.beforeEach(async ({ page }) => {
    // Stub SpeechSynthesis in headless browser to prevent hanging on playback
    await page.addInitScript(() => {
      const mockSpeechSynthesis = {
        speaking: false,
        pending: false,
        paused: false,
        speak: (utterance) => {
          mockSpeechSynthesis.speaking = true;
          if (utterance.onstart) {
            utterance.onstart();
          }
          setTimeout(() => {
            mockSpeechSynthesis.speaking = false;
            if (utterance.onend) {
              utterance.onend();
            }
          }, 100);
        },
        cancel: () => {
          mockSpeechSynthesis.speaking = false;
        },
        getVoices: () => [],
        pause: () => {},
        resume: () => {},
      };
      
      Object.defineProperty(window, 'speechSynthesis', {
        value: mockSpeechSynthesis,
        configurable: true,
        writable: true,
      });

      // Stub SpeechSynthesisUtterance so browserSpeak can construct it
      window.SpeechSynthesisUtterance = function (text) {
        this.text = text;
        this.lang = '';
        this.onstart = null;
        this.onend = null;
        this.onerror = null;
      };
    });
  });

  test('should fallback to browser voice and save to history on successful speech', async ({ page }) => {
    // Force the backend TTS API to fail so browser fallback is triggered
    await page.route('**/api/voice/speak', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'No voice profile configured' }),
      })
    );

    await page.goto('/');

    // Navigate to the Compose tab
    await page.getByLabel('VoiceForge pages').getByRole('button', { name: 'Compose' }).click();

    // Verify Composer is visible
    await expect(page.locator('h1', { hasText: 'VoiceForge' }).first()).toBeVisible();
    await expect(page.locator('textarea[id="vf-compose"]')).toBeVisible();

    // Type a message in the composer
    const testMessage = 'Hello, this is a test message from Playwright!';
    await page.locator('textarea[id="vf-compose"]').fill(testMessage);

    // Click Speak & Save button
    await page.getByRole('button', { name: /Speak & Save/i }).click();

    // Verify browser fallback toast is shown (since no profile has been cloned yet)
    await expect(page.getByText('Using browser voice fallback')).toBeVisible();

    // Verify success toast for saving to history
    await expect(page.getByText('Saved to history')).toBeVisible();

    // Verify it is added to the speech history list in the sidebar
    await expect(page.getByLabel('Speech history').first()).toBeVisible();
    await expect(page.getByText(testMessage).first()).toBeVisible();
  });

  test('should reject empty message and not save to history', async ({ page }) => {
    await page.goto('/');

    // Navigate to the Compose tab
    await page.getByLabel('VoiceForge pages').getByRole('button', { name: 'Compose' }).click();

    // Click Speak & Save with empty composer
    await page.getByRole('button', { name: /Speak & Save/i }).click();

    // Verify warning toast is shown
    await expect(page.getByText('Please type a message first')).toBeVisible();

    // Verify no new items in history
    await expect(page.getByText('No history yet.')).toBeVisible();
  });

});
