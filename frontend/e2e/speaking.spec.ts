import { test, expect } from '@playwright/test';

// Uses the storageState created by global-setup (real registered user with valid JWT).

test('speaking page renders for authenticated user', async ({ page }) => {
  await page.goto('/speaking');

  await expect(page.getByRole('heading', { name: 'Speaking' })).toBeVisible();
  await expect(page.getByText('Read the generated text aloud, record yourself, and get pronunciation feedback.')).toBeVisible();
});

test('speaking page shows AudioRecorder with Start Recording and Stop buttons', async ({ page }) => {
  await page.goto('/speaking');

  await expect(page.getByRole('heading', { name: 'Audio Recording' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Recording' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  // Stop is disabled until recording starts
  await expect(page.getByRole('button', { name: 'Stop' })).toBeDisabled();
});

test('speaking page shows Generated Text section and Generate text button', async ({ page }) => {
  await page.goto('/speaking');

  await expect(page.getByRole('heading', { name: 'Generated Text' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate text' })).toBeVisible();
  // Placeholder shown before text is generated
  await expect(page.getByText('Click "Generate text" to get a passage to read aloud.')).toBeVisible();
});

test('"Generate text" button shows generated passage', async ({ page }) => {
  await page.goto('/speaking');
  await page.getByRole('button', { name: 'Generate text' }).click();

  // Mock text appears after a short timeout
  await expect(
    page.getByText('The morning light filtered through the curtains'),
  ).toBeVisible({ timeout: 5_000 });
});
