import { test, expect } from '@playwright/test';

// Uses the storageState created by global-setup (real registered user with valid JWT).

test('settings page renders for authenticated user', async ({ page }) => {
  await page.goto('/settings');

  await expect(page.getByRole('heading', { name: 'Profile / Settings' })).toBeVisible();
  await expect(page.getByText('Manage level, theme, language, and account session.')).toBeVisible();
});

test('settings page shows all supported languages', async ({ page }) => {
  await page.goto('/settings');

  const dropdown = page.getByTestId('select-language');
  await expect(dropdown.locator('button')).toBeVisible();

  // Open the dropdown
  await dropdown.locator('button').click();

  for (const lang of ['English', 'German', 'Albanian', 'Polish']) {
    await expect(dropdown.locator(`li[role="option"]`, { hasText: lang })).toBeVisible();
  }
});

test('settings page shows CEFR level options', async ({ page }) => {
  await page.goto('/settings');

  const dropdown = page.getByTestId('select-level');
  await expect(dropdown.locator('button')).toBeVisible();

  // Open the dropdown
  await dropdown.locator('button').click();

  for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
    await expect(dropdown.locator(`li[role="option"]`, { hasText: level })).toBeVisible();
  }
});

test('settings page shows theme options', async ({ page }) => {
  await page.goto('/settings');

  const dropdown = page.getByTestId('select-theme');
  await expect(dropdown.locator('button')).toBeVisible();

  // Open the dropdown
  await dropdown.locator('button').click();

  for (const theme of ['Light', 'Dark', 'System']) {
    await expect(dropdown.locator(`li[role="option"]`, { hasText: theme })).toBeVisible();
  }
});

test('settings page shows logged-in user email and logout button', async ({ page }) => {
  await page.goto('/settings');

  // "Signed in as: <email>" text is shown
  await expect(page.getByText(/Signed in as:/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
});
