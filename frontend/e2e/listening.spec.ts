import { test, expect } from '@playwright/test';

// Uses the storageState created by global-setup (real registered user with valid JWT).

const MOCK_TASK = {
  taskId: 1,
  prompt: 'Listen to the passage and answer the question.',
  audioBase64: null,
  audioUrl: null,
  mimeType: null,
  answerOptions: ['Option A', 'Option B', 'Option C', 'Option D'],
  durationEstimateMs: null,
};

test('listening page renders for authenticated user', async ({ page }) => {
  await page.goto('/listening');

  await expect(page.getByRole('heading', { name: 'Listening' })).toBeVisible();
  // Subtitle includes language and level and prompt to press Play
  await expect(page.getByText(/press Play to load a task/)).toBeVisible();
  // Play button is shown before any task is loaded
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
});

test('clicking Play fetches and displays a task', async ({ page }) => {
  await page.route('**/api/audio/listening-task**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TASK),
    });
  });

  await page.goto('/listening');
  await page.getByRole('button', { name: 'Play' }).click();

  // Task prompt appears
  await expect(page.getByText(MOCK_TASK.prompt)).toBeVisible({ timeout: 5_000 });
  // Answer option buttons appear
  await expect(page.getByRole('button', { name: /Option A/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Option B/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Option C/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Option D/ })).toBeVisible();
  // Submit button is present (disabled until an answer is selected)
  await expect(page.getByRole('button', { name: 'Submit Answer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit Answer' })).toBeDisabled();
});

test('selecting an answer option highlights it and enables Submit', async ({ page }) => {
  await page.route('**/api/audio/listening-task**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TASK),
    });
  });

  await page.goto('/listening');
  await page.getByRole('button', { name: 'Play' }).click();

  const option = page.getByRole('button', { name: /Option A/ });
  await option.waitFor({ state: 'visible', timeout: 5_000 });
  await option.click();

  // Selected option gets teal highlight
  await expect(option).toHaveClass(/border-teal-600/);
  // Submit becomes enabled
  await expect(page.getByRole('button', { name: 'Submit Answer' })).toBeEnabled();
});

test('submitting correct answer shows 100% result and Next Task button', async ({ page }) => {
  await page.route('**/api/audio/listening-task**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TASK),
    });
  });

  await page.route('**/api/audio/listening-score**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ score: 1, correct: 4, total: 4 }),
    });
  });

  await page.goto('/listening');
  await page.getByRole('button', { name: 'Play' }).click();

  const option = page.getByRole('button', { name: /Option A/ });
  await option.waitFor({ state: 'visible', timeout: 5_000 });
  await option.click();
  await page.getByRole('button', { name: 'Submit Answer' }).click();

  await expect(page.getByText('100%')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(/Perfect/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next Task' })).toBeVisible();
});

test('submitting wrong answer shows non-100% result', async ({ page }) => {
  await page.route('**/api/audio/listening-task**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TASK),
    });
  });

  await page.route('**/api/audio/listening-score**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ score: 0, correct: 0, total: 4 }),
    });
  });

  await page.goto('/listening');
  await page.getByRole('button', { name: 'Play' }).click();

  const option = page.getByRole('button', { name: /Option B/ });
  await option.waitFor({ state: 'visible', timeout: 5_000 });
  await option.click();
  await page.getByRole('button', { name: 'Submit Answer' }).click();

  await expect(page.getByText('0%')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(/Not quite/)).toBeVisible();
});

test('shows loading state while fetching task', async ({ page }) => {
  let resolve: () => void;
  const blocker = new Promise<void>((r) => { resolve = r; });

  await page.route('**/api/audio/listening-task**', async (route) => {
    await blocker;
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TASK),
    });
  });

  await page.goto('/listening');
  await page.getByRole('button', { name: 'Play' }).click();

  await expect(page.getByText('Loading task…')).toBeVisible({ timeout: 3_000 });
  resolve!();
});

test('shows error message when task fetch fails', async ({ page }) => {
  await page.route('**/api/audio/listening-task**', (route) => {
    route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Audio service unavailable' }),
    });
  });

  await page.goto('/listening');
  await page.getByRole('button', { name: 'Play' }).click();

  await expect(page.getByText(/Audio service unavailable|Failed to load/i)).toBeVisible({ timeout: 5_000 });
});
