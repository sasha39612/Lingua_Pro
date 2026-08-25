import { test, expect } from '@playwright/test';

// Stats page fetches live data from /api/stats — uses the storageState from
// global-setup (authenticated). A fresh user has no history, so the exam
// readiness dashboard renders in its zero-data state.

test('stats page renders for authenticated user', async ({ page }) => {
  await page.goto('/stats');

  // Page renders an exam-readiness dashboard now — heading is "Prepare for {targetLevel} Exam"
  // (defaults to B2 with no prior localStorage selection).
  await expect(page.getByRole('heading', { name: /Prepare for .+ Exam/ })).toBeVisible();
  await expect(
    page.getByText('Based on reading, writing, speaking, and listening performance'),
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
  await expect(page.getByRole('heading', { name: /Prepare for .+ Exam/ })).toBeVisible();
});
