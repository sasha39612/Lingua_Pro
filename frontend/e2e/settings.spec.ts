import { test, expect } from '@playwright/test';

// Uses the storageState created by global-setup (real registered user with valid JWT).

test('settings page renders for authenticated user', async ({ page }) => {
  await page.goto('/settings');

  await expect(page.getByRole('heading', { name: 'Profile / Settings' })).toBeVisible();
  await expect(page.getByText('Manage level, theme, language, and account session.')).toBeVisible();
});

test('settings page shows all supported languages', async ({ page }) => {
  await page.goto('/settings');

  const languageSelect = page.locator('select').filter({ hasText: 'English' }).last();
  await expect(languageSelect).toBeVisible();

  for (const lang of ['English', 'German', 'Albanian', 'Polish']) {
    await expect(languageSelect.locator(`option[value="${lang}"], option:text-is("${lang}")`)).toHaveCount(1);
  }
});

test('settings page shows CEFR level options', async ({ page }) => {
  await page.goto('/settings');

  const levelSelect = page.locator('select').first();
  await expect(levelSelect).toBeVisible();

  for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
    await expect(levelSelect.locator(`option:text-is("${level}")`)).toHaveCount(1);
  }
});

test('settings page shows theme options', async ({ page }) => {
  await page.goto('/settings');

  const themeSelect = page.locator('select').nth(1);
  await expect(themeSelect).toBeVisible();
  await expect(themeSelect.locator('option[value="light"]')).toHaveCount(1);
  await expect(themeSelect.locator('option[value="dark"]')).toHaveCount(1);
  await expect(themeSelect.locator('option[value="system"]')).toHaveCount(1);
});

test('settings page shows logged-in user email and logout button', async ({ page }) => {
  await page.goto('/settings');

  // "Signed in as: <email>" text is shown
  await expect(page.getByText(/Signed in as:/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
});
