import { test, expect } from '@playwright/test';

// Uses the storageState created by global-setup (real registered user with valid JWT).
// The listening page drives a two-phase SSE stream at POST /api/audio/listening-task/stream
// (task_ready → questions render, then audio_ready → audio becomes playable).

function sseBody(events: unknown[]): string {
  return events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
}

const MOCK_QUESTION = {
  index: 0,
  type: 'multiple_choice' as const,
  question: 'What did the speaker mention?',
  options: ['Option A', 'Option B', 'Option C', 'Option D'],
};

function mockTaskStream(page: import('@playwright/test').Page) {
  return page.route('**/api/audio/listening-task/stream', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody([
        { event: 'task_ready', data: { taskId: 1, passage: 'Test passage.', questions: [MOCK_QUESTION] } },
        { event: 'audio_ready', data: { taskId: 1, audioBase64: 'dGVzdA==', mimeType: 'audio/mpeg' } },
      ]),
    });
  });
}

test('listening page renders for authenticated user', async ({ page }) => {
  await page.goto('/listening');

  await expect(page.getByRole('heading', { name: 'Listening' })).toBeVisible();
  // Subtitle shows the user's language and level
  await expect(page.getByText('English · A2')).toBeVisible();
  // Play button is shown before any task is loaded
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
});

test('clicking Play fetches and displays a task', async ({ page }) => {
  await mockTaskStream(page);

  await page.goto('/listening');
  await page.getByRole('button', { name: 'Play' }).click();

  // Question text appears once task_ready is processed
  await expect(page.getByText(MOCK_QUESTION.question)).toBeVisible({ timeout: 5_000 });
  // Answer option buttons appear
  await expect(page.getByRole('button', { name: /Option A/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Option B/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Option C/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Option D/ })).toBeVisible();
  // Submit button is present (disabled until an answer is selected)
  await expect(page.getByRole('button', { name: 'Submit Answers' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit Answers' })).toBeDisabled();
});

test('selecting an answer option highlights it and enables Submit', async ({ page }) => {
  await mockTaskStream(page);

  await page.goto('/listening');
  await page.getByRole('button', { name: 'Play' }).click();

  const option = page.getByRole('button', { name: /Option A/ });
  await option.waitFor({ state: 'visible', timeout: 5_000 });
  await option.click();

  // Selected option gets the slate "chosen" highlight (pre-submission)
  await expect(option).toHaveClass(/border-slate-400/);
  // Submit becomes enabled
  await expect(page.getByRole('button', { name: 'Submit Answers' })).toBeEnabled();
});

test('submitting correct answer shows 100% result and Next Task button', async ({ page }) => {
  await mockTaskStream(page);

  await page.route('**/api/audio/listening-answers', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        score: 1,
        rawScore: 1,
        maxRawScore: 1,
        correct: 1,
        total: 1,
        results: [
          {
            questionIndex: 0,
            question: MOCK_QUESTION.question,
            type: 'multiple_choice',
            correct: true,
            userAnswer: 0,
            correctAnswer: 0,
            correctOptionText: 'Option A',
            points: 1,
            maxPoints: 1,
          },
        ],
      }),
    });
  });

  await page.goto('/listening');
  await page.getByRole('button', { name: 'Play' }).click();

  const option = page.getByRole('button', { name: /Option A/ });
  await option.waitFor({ state: 'visible', timeout: 5_000 });
  await option.click();
  await page.getByRole('button', { name: 'Submit Answers' }).click();

  await expect(page.getByText('100%')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(/Perfect/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next Task' })).toBeVisible();
});

test('submitting wrong answer shows non-100% result', async ({ page }) => {
  await mockTaskStream(page);

  await page.route('**/api/audio/listening-answers', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        score: 0,
        rawScore: 0,
        maxRawScore: 1,
        correct: 0,
        total: 1,
        results: [
          {
            questionIndex: 0,
            question: MOCK_QUESTION.question,
            type: 'multiple_choice',
            correct: false,
            userAnswer: 1,
            correctAnswer: 0,
            correctOptionText: 'Option A',
            points: 0,
            maxPoints: 1,
          },
        ],
      }),
    });
  });

  await page.goto('/listening');
  await page.getByRole('button', { name: 'Play' }).click();

  const option = page.getByRole('button', { name: /Option B/ });
  await option.waitFor({ state: 'visible', timeout: 5_000 });
  await option.click();
  await page.getByRole('button', { name: 'Submit Answers' }).click();

  await expect(page.getByText('0%')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(/Keep practising/)).toBeVisible();
});

test('shows loading state while fetching task', async ({ page }) => {
  let resolve: () => void;
  const blocker = new Promise<void>((r) => { resolve = r; });

  await page.route('**/api/audio/listening-task/stream', async (route) => {
    await blocker;
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody([
        { event: 'task_ready', data: { taskId: 1, passage: 'Test passage.', questions: [MOCK_QUESTION] } },
        { event: 'audio_ready', data: { taskId: 1, audioBase64: 'dGVzdA==', mimeType: 'audio/mpeg' } },
      ]),
    });
  });

  await page.goto('/listening');
  await page.getByRole('button', { name: 'Play' }).click();

  await expect(page.getByText('Generating passage…')).toBeVisible({ timeout: 3_000 });
  resolve!();
});

test('shows error message when task fetch fails', async ({ page }) => {
  await page.route('**/api/audio/listening-task/stream', (route) => {
    route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Audio service unavailable' }),
    });
  });

  await page.goto('/listening');
  await page.getByRole('button', { name: 'Play' }).click();

  await expect(page.getByText(/Connection error/i)).toBeVisible({ timeout: 5_000 });
});
