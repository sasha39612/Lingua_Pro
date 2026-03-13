import { test, expect } from '@playwright/test';

// Uses the storageState created by global-setup (authenticated student user).

test('admin page renders for authenticated user', async ({ page }) => {
  await page.goto('/admin');

  await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
  await expect(page.getByText('User management, monitoring, and AI usage overview.')).toBeVisible();
});

test('admin page shows KPI cards', async ({ page }) => {
  await page.goto('/admin');

  await expect(page.getByText('Active users')).toBeVisible();
  await expect(page.getByText('AI requests today')).toBeVisible();
  await expect(page.getByText('Gateway p95')).toBeVisible();
});

test('admin page shows User Management table with correct columns', async ({ page }) => {
  await page.goto('/admin');

  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
  for (const col of ['ID', 'Email', 'Role', 'Level', 'Status']) {
    await expect(page.getByRole('columnheader', { name: col })).toBeVisible();
  }
});

test('admin page user table contains sample users', async ({ page }) => {
  await page.goto('/admin');

  await expect(page.getByText('anna@lingua.pro')).toBeVisible();
  await expect(page.getByText('admin@lingua.pro')).toBeVisible();
});

// Unauthenticated visitors — verify /admin is protected
test.describe('unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('unauthenticated visit to /admin redirects to /login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL('/login', { timeout: 10_000 });
  });
});
