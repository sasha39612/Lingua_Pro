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

  // ChartsSection renders two cards: "Progress Over Time" and "Mistakes by Type"
  await expect(page.getByRole('heading', { name: 'Progress Over Time' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mistakes by Type' })).toBeVisible();
});

test('dashboard links to stats page', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Statistic' }).click();

  await expect(page).toHaveURL('/stats');
  await expect(page.getByRole('heading', { name: /Prepare for .+ Exam/ })).toBeVisible();
});
