import { test, expect } from '@playwright/test';

// Uses the storageState created by global-setup (real registered user with valid JWT).
// The reading page drives a two-phase SSE stream at POST /api/reading/task/stream,
// emitting task_ready (data is an array: ev.data[0]) with a passage + questions.

function sseBody(events: unknown[]): string {
  return events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
}

const MOCK_TASK = {
  taskId: 1,
  passage: 'Test reading passage for e2e.',
  questions: [
    { type: 'multiple_choice', question: 'What time does she wake up?', options: ['Six-thirty', 'Seven', 'Eight', 'Nine'], correctAnswer: 'A' },
    { type: 'multiple_choice', question: 'What day is it?', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], correctAnswer: 'B' },
    { type: 'multiple_choice', question: 'Where is she going?', options: ['Paris', 'London', 'Berlin', 'Madrid'], correctAnswer: 'C' },
  ],
};

function mockTaskStream(page: import('@playwright/test').Page) {
  return page.route('**/api/reading/task/stream', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody([{ event: 'task_ready', data: [MOCK_TASK] }]),
    });
  });
}

test('reading page renders for authenticated user', async ({ page }) => {
  await page.goto('/reading');

  await expect(page.getByRole('heading', { name: 'Reading' })).toBeVisible();
  await expect(page.getByText('English · A2')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Reading' })).toBeVisible();
});

test('reading page shows passage text', async ({ page }) => {
  await mockTaskStream(page);

  await page.goto('/reading');
  await page.getByRole('button', { name: 'Start Reading' }).click();

  await expect(page.getByText(/Test reading passage/)).toBeVisible({ timeout: 5_000 });
});

test('reading page shows comprehension questions with options', async ({ page }) => {
  await mockTaskStream(page);

  await page.goto('/reading');
  await page.getByRole('button', { name: 'Start Reading' }).click();

  await expect(page.getByRole('heading', { name: 'Multiple Choice' })).toBeVisible({ timeout: 5_000 });
  // Option buttons render as "{letter}.{text}" with no space between — match on
  // the distinctive option text rather than the exact concatenated label.
  await expect(page.getByRole('button', { name: /Six-thirty/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Tuesday/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Berlin/ })).toBeVisible();
});

test('submitting answers shows score result', async ({ page }) => {
  await mockTaskStream(page);

  await page.goto('/reading');
  await page.getByRole('button', { name: 'Start Reading' }).click();

  // Option buttons render as "{letter}.{text}" with no space between — match on
  // the distinctive option text rather than the exact concatenated label.
  await expect(page.getByRole('button', { name: /Six-thirty/ })).toBeVisible({ timeout: 5_000 });

  // Only the first answer is correct (1/3) — the other two are deliberately wrong.
  await page.getByRole('button', { name: /Six-thirty/ }).click();
  await page.getByRole('button', { name: /Monday/ }).click();
  await page.getByRole('button', { name: /Paris/ }).click();

  await page.getByRole('button', { name: 'Submit Answers' }).click();

  await expect(page.getByText('33%')).toBeVisible({ timeout: 5_000 });
});
