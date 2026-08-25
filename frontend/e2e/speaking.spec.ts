import { test, expect } from '@playwright/test';

// Uses the storageState created by global-setup (real registered user with valid JWT).

test('speaking page renders for authenticated user', async ({ page }) => {
  await page.goto('/speaking');

  await expect(page.getByRole('heading', { name: 'Speaking' })).toBeVisible();
  // Subtitle shows the user's language and level (matches reading/listening pages)
  await expect(page.getByText('English · A2')).toBeVisible();
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
  const mockText = 'The morning light filtered through the curtains as she prepared her bag.';

  // The speaking page fetches its task via a two-phase SSE stream, matching
  // reading/listening — not a GraphQL Tasks query.
  await page.route('**/api/speaking/task/stream', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: `data: ${JSON.stringify({ event: 'task_ready', data: [{ referenceText: mockText, focusPhonemes: [] }] })}\n\n`,
    });
  });

  await page.goto('/speaking');
  await page.getByRole('button', { name: 'Generate text' }).click();

  await expect(page.getByText(mockText)).toBeVisible({ timeout: 5_000 });
});
