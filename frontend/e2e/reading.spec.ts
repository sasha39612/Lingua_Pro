import { test, expect } from '@playwright/test';

// Uses the storageState created by global-setup (real registered user with valid JWT).

test('reading page renders for authenticated user', async ({ page }) => {
  await page.goto('/reading');

  await expect(page.getByRole('heading', { name: 'Reading' })).toBeVisible();
  await expect(page.getByText('Passage + optional audio + comprehension questions.')).toBeVisible();
});

test('reading page shows passage text', async ({ page }) => {
  await page.goto('/reading');

  // The static passage starts with "Marta wakes up"
  await expect(page.getByText(/Marta wakes up/)).toBeVisible();
});

test('reading page shows comprehension questions with inputs', async ({ page }) => {
  await page.goto('/reading');

  await expect(page.getByRole('heading', { name: /Questions/ })).toBeVisible();
  // Three answer inputs
  const inputs = page.getByPlaceholder('Write your answer');
  await expect(inputs).toHaveCount(3);
});

test('auto score updates when correct answer is entered', async ({ page }) => {
  await page.goto('/reading');

  // Initial score is 0%
  await expect(page.getByText('Auto score:')).toBeVisible();
  await expect(page.getByText('0%')).toBeVisible();

  // Fill the first answer correctly ("6:30" → matches "6:30")
  await page.getByPlaceholder('Write your answer').first().fill('6:30');

  // Score should now be non-zero (1/3 = 33%)
  await expect(page.getByText('33%')).toBeVisible();
});
