import { test, expect } from '@playwright/test';

// Uses the storageState created by global-setup (real registered user with valid JWT).

test('speaking page renders for authenticated user', async ({ page }) => {
  await page.goto('/speaking');

  await expect(page.getByRole('heading', { name: 'Speaking' })).toBeVisible();
  await expect(page.getByText('Record + playback + AI speaking feedback.')).toBeVisible();
});

test('speaking page shows AudioRecorder with Start Recording and Stop buttons', async ({ page }) => {
  await page.goto('/speaking');

  await expect(page.getByRole('heading', { name: 'Audio Recording' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Recording' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  // Stop is disabled until recording starts
  await expect(page.getByRole('button', { name: 'Stop' })).toBeDisabled();
});

test('speaking page shows prompt textarea and Generate AI feedback button', async ({ page }) => {
  await page.goto('/speaking');

  await expect(page.getByRole('heading', { name: 'Prompt' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate AI feedback' })).toBeVisible();
  // Default prompt text is pre-filled
  await expect(page.locator('textarea')).toHaveValue('Describe your day in 4 to 5 sentences.');
});

test('"Generate AI feedback" shows AI Feedback section', async ({ page }) => {
  // Intercept /api/ai-feedback so the test does not depend on ai-orchestrator
  await page.route('**/api/ai-feedback**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body: 'Excellent speaking practice!',
    });
  });

  await page.goto('/speaking');
  await page.getByRole('button', { name: 'Generate AI feedback' }).click();

  await expect(page.getByRole('heading', { name: 'AI Feedback' })).toBeVisible();
  await expect(page.locator('p.text-teal-900')).not.toBeEmpty({ timeout: 10_000 });
});
