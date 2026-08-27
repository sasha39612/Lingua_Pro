import { test, expect } from '@playwright/test';

// Uses the storageState created by admin-setup (a genuine server-side admin user).

test('admin page renders for authenticated admin user', async ({ page }) => {
  await page.goto('/admin');

  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  await expect(page.getByText('Platform health, user growth, and learning effectiveness.')).toBeVisible();
});

test('admin page shows overview KPI cards', async ({ page }) => {
  await page.goto('/admin');

  await expect(page.getByText('Total sessions')).toBeVisible();
  await expect(page.getByText('Top language')).toBeVisible();
  await expect(page.getByText('Avg reading score')).toBeVisible();
  await expect(page.getByText('Avg speaking score')).toBeVisible();
});

test('admin page shows Users tab with correct columns', async ({ page }) => {
  await page.goto('/admin');

  await page.getByRole('button', { name: 'Users' }).click();
  for (const col of ['Email', 'Role', 'Language', 'Joined']) {
    await expect(page.getByRole('columnheader', { name: col })).toBeVisible();
  }
});

test('admin page user table contains the logged-in admin', async ({ page }) => {
  await page.goto('/admin');

  // The admin's own email is generated fresh per test run in admin-setup.ts —
  // read it back from the Zustand state admin-setup wrote into localStorage
  // rather than hardcoding/importing a value, since a shared constant
  // computed from Date.now() at module-load time isn't guaranteed to match
  // across the separate processes/retries that setup and this spec run in.
  const adminEmail = await page.evaluate(() => {
    const raw = localStorage.getItem('lingua-pro-zustand');
    return raw ? (JSON.parse(raw)?.state?.user?.email as string | undefined) : undefined;
  });
  expect(adminEmail).toBeTruthy();

  await page.getByRole('button', { name: 'Users' }).click();
  await expect(page.getByText(adminEmail as string)).toBeVisible();
});

// Unauthenticated visitors — verify /admin is protected
test.describe('unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('unauthenticated visit to /admin redirects to /login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL('/login', { timeout: 10_000 });
  });
});
