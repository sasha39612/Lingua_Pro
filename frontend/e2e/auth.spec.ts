import { test, expect } from '@playwright/test';

// All auth tests start unauthenticated — override the project-level storageState.
test.use({ storageState: { cookies: [], origins: [] } });

test('demo user button redirects to dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Demo User' }).click();

  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText('LanguageLab')).toBeVisible();
});

test('demo admin button redirects to dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Demo Admin' }).click();

  await expect(page).toHaveURL('/dashboard');
});

test('invalid credentials stay on login page with error', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill('nobody@example.com');
  await page.getByPlaceholder('Password').fill('WrongPass123');
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for the login mutation to complete (button leaves pending state)
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL('/login');
  // Status message should no longer be the default greeting
  await expect(
    page.getByText('Please login to access learning tasks.'),
  ).not.toBeVisible();
});

test('authenticated user visiting /login is redirected to dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Demo User' }).click();
  await page.waitForURL('**/dashboard');

  // Revisiting /login should bounce back to /dashboard
  await page.goto('/login');
  await expect(page).toHaveURL('/dashboard');
});

test('logout returns user to login page', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Demo User' }).click();
  await page.waitForURL('**/dashboard');

  await page.getByRole('button', { name: 'Log Out' }).click();
  await expect(page).toHaveURL('/login');
});
