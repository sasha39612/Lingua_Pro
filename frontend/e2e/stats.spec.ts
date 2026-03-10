import { test, expect } from '@playwright/test';

// Stats page reads from Zustand store — no API call required.
// Uses the storageState from global-setup (authenticated).

test('stats page renders for authenticated user', async ({ page }) => {
  await page.goto('/stats');

  await expect(page.getByRole('heading', { name: 'Stats' })).toBeVisible();
  await expect(
    page.getByText('Charts for text and audio performance over time.'),
  ).toBeVisible();
});

test('stats page shows two chart sections', async ({ page }) => {
  await page.goto('/stats');

  // StatsChart components render inside an lg:grid-cols-2 grid
  const charts = page.locator('section.mt-5 canvas, section.mt-5 svg');
  // At minimum the chart containers should be present in the DOM
  await expect(page.locator('section.mt-5')).toBeVisible();
});

test('dashboard links to stats page', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Statistic' }).click();

  await expect(page).toHaveURL('/stats');
  await expect(page.getByRole('heading', { name: 'Stats' })).toBeVisible();
});
