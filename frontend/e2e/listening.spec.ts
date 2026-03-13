import { test, expect } from '@playwright/test';

// Uses the storageState created by global-setup (real registered user with valid JWT).

test('listening page renders for authenticated user', async ({ page }) => {
  await page.goto('/listening');

  await expect(page.getByRole('heading', { name: 'Listening' })).toBeVisible();
  await expect(page.getByText('Audio player + comprehension questions + AI feedback.')).toBeVisible();
});

test('listening page shows comprehension questions with option buttons', async ({ page }) => {
  await page.goto('/listening');

  await expect(page.getByRole('heading', { name: 'Questions' })).toBeVisible();
  // First question
  await expect(page.getByText('What is the speaker planning for tomorrow?')).toBeVisible();
  // Option buttons exist
  await expect(page.getByRole('button', { name: 'A meeting' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'A trip' })).toBeVisible();
});

test('selecting an answer option highlights it', async ({ page }) => {
  await page.goto('/listening');

  const option = page.getByRole('button', { name: 'A meeting' });
  await option.click();

  // Selected option gets teal classes
  await expect(option).toHaveClass(/border-teal-600/);
});

test('"Get AI feedback" button shows AI Feedback section', async ({ page }) => {
  // Intercept /api/ai-feedback so the test does not depend on ai-orchestrator
  await page.route('**/api/ai-feedback**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body: 'Good listening comprehension!',
    });
  });

  await page.goto('/listening');

  await expect(page.getByRole('button', { name: 'Get AI feedback' })).toBeVisible();
  await page.getByRole('button', { name: 'Get AI feedback' }).click();

  await expect(page.getByRole('heading', { name: 'AI Feedback' })).toBeVisible();
  // StreamedFeedback teal paragraph eventually has content
  await expect(page.locator('p.text-teal-900')).not.toBeEmpty({ timeout: 10_000 });
});
