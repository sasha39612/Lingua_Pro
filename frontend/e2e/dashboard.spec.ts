import { test, expect } from '@playwright/test';

// Uses storageState from global-setup (real registered user).

test('dashboard renders user info and skill cards', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.getByText('LanguageLab')).toBeVisible();
  await expect(page.getByText('Language Studying')).toBeVisible();

  // Skill cards — each skill also has a matching icon link in the top nav,
  // so scope to the last match (the card grid, which renders after the nav).
  for (const skill of ['Speaking', 'Listening', 'Reading', 'Writing']) {
    await expect(page.getByRole('link', { name: skill }).last()).toBeVisible();
  }
});

test('dashboard shows logged-in user email', async ({ page }) => {
  await page.goto('/dashboard');

  // The email badge shows the authenticated user's email
  const emailBadge = page.locator('span', { hasText: /User:/ });
  await expect(emailBadge).toBeVisible();
  // Should not be showing "guest" since we have a real logged-in user
  await expect(emailBadge).not.toHaveText('User: guest');
});
