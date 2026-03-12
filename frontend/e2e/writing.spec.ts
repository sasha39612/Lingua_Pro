import { test, expect } from '@playwright/test';

// Uses the storageState created by global-setup (real registered user with valid JWT).

test('writing page renders for authenticated user', async ({ page }) => {
  await page.goto('/writing');

  await expect(page.getByRole('heading', { name: 'Writing' })).toBeVisible();
  await expect(page.getByPlaceholder('Write your paragraph here')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Get Corrections' })).toBeVisible();
  // Default status message
  await expect(page.getByText('Submit text for AI corrections.')).toBeVisible();
});

test('submitting text shows AI feedback section', async ({ page }) => {
  await page.goto('/writing');

  await page.getByPlaceholder('Write your paragraph here').fill(
    'She go to the store yesterday and buyed many things for her family.',
  );

  // Capture any /api/graphql response to help diagnose failures
  let graphqlResponse = '(no request captured)';
  page.on('response', (resp) => {
    if (resp.url().includes('/api/graphql')) {
      resp.text().then((t) => { graphqlResponse = `HTTP ${resp.status()}: ${t.slice(0, 500)}`; }).catch(() => {});
    }
  });

  await page.getByRole('button', { name: 'Get Corrections' }).click();

  // Status updates to confirmation message (AI orchestrator local fallback is fast)
  const statusEl = page.locator('p.bg-slate-900');
  const passed = await page.getByText('AI correction received.').waitFor({ state: 'visible', timeout: 30_000 }).then(() => true).catch(() => false);
  if (!passed) {
    const statusText = await statusEl.textContent().catch(() => '(could not read status)');
    throw new Error(`Expected 'AI correction received.' but status was: '${statusText}' | GraphQL response: ${graphqlResponse}`);
  }

  // AI Feedback section appears below the editor
  await expect(page.getByRole('heading', { name: 'AI Feedback' })).toBeVisible();
});

test('submitting too-short text does not call API', async ({ page }) => {
  await page.goto('/writing');

  // Zod schema requires min 6 chars; 3 chars should be rejected client-side
  await page.getByPlaceholder('Write your paragraph here').fill('Hi');
  await page.getByRole('button', { name: 'Get Corrections' }).click();

  // Status message should NOT change (validation prevents submission)
  await expect(page.getByText('Submit text for AI corrections.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'AI Feedback' })).not.toBeVisible();
});
