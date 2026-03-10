import { test, expect } from '@playwright/test';

// All tests in this file verify routing behaviour for unauthenticated visitors.
test.use({ storageState: { cookies: [], origins: [] } });

// Protected routes — AppShell redirects to /login when no token is present.
for (const route of ['/writing', '/reading', '/speaking', '/listening', '/settings']) {
  test(`unauthenticated visit to ${route} redirects to /login`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL('/login', { timeout: 10_000 });
  });
}

test('/dashboard is accessible without authentication', async ({ page }) => {
  await page.goto('/dashboard');
  // AppShell treats /dashboard as public
  await expect(page.getByText('LanguageLab')).toBeVisible();
  await expect(page).toHaveURL('/dashboard');
});

test('/login page renders correctly without authentication', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect(page.getByPlaceholder('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Demo User' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Demo Admin' })).toBeVisible();
});

test('dashboard skill cards navigate to correct routes when authenticated', async ({ page }) => {
  // Authenticate via demo button first
  await page.goto('/login');
  await page.getByRole('button', { name: 'Demo User' }).click();
  await page.waitForURL('**/dashboard');

  await page.getByRole('link', { name: 'Writing' }).click();
  await expect(page).toHaveURL('/writing');
  await expect(page.getByRole('heading', { name: 'Writing' })).toBeVisible();
});
