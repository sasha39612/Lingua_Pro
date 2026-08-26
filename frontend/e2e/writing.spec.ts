import { test, expect } from '@playwright/test';

// Uses the storageState created by global-setup (real registered user with valid JWT).
// The writing page drives a task-first flow: Generate Task → Start Writing → Submit,
// backed by GET /api/writing/task and a POST /api/writing/analyze/stream SSE endpoint.

const MOCK_TASK = {
  situation: 'You are writing to a friend about your recent trip.',
  taskDescription: 'Describe your trip and what you enjoyed most.',
  taskPoints: ['Where you went', 'What you did', 'What you enjoyed'],
  wordCountMin: 6,
  wordCountMax: 180,
  style: 'informal',
  instructions: ['Use past tense'],
  exampleStructure: ['Greeting', 'Body', 'Closing'],
};

function mockTask(page: import('@playwright/test').Page) {
  return page.route('**/api/writing/task**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ taskId: 1, writingTask: MOCK_TASK }),
    });
  });
}

function sseBody(events: unknown[]): string {
  return events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
}

const MOCK_ANALYSIS_EVENTS = [
  { event: 'analysis_started' },
  { event: 'criterion', data: { key: 'taskAchievement', score: 0.8, feedback: 'Good coverage.' } },
  { event: 'criterion', data: { key: 'grammarVocabulary', score: 0.7, feedback: 'Some errors.' } },
  { event: 'criterion', data: { key: 'coherenceStructure', score: 0.75, feedback: 'Well organized.' } },
  { event: 'criterion', data: { key: 'style', score: 0.6, feedback: 'Could be more formal.' } },
  {
    event: 'analysis_complete',
    data: {
      overallScore: 0.75,
      overallFeedback: 'Solid attempt with a few grammar issues.',
      correctedText: 'She went to the store yesterday and bought many things for her family.',
    },
  },
];

function mockAnalyzeStream(page: import('@playwright/test').Page) {
  return page.route('**/api/writing/analyze/stream', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody(MOCK_ANALYSIS_EVENTS),
    });
  });
}

async function startWriting(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Generate Task' }).click();
  await expect(page.getByRole('heading', { name: 'Your Task' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Start Writing' }).click();
}

test('writing page renders for authenticated user', async ({ page }) => {
  await page.goto('/writing');

  await expect(page.getByRole('heading', { name: 'Writing' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate Task' })).toBeVisible();
});

test('generating a task shows the editor with word counter', async ({ page }) => {
  await mockTask(page);

  await page.goto('/writing');
  await startWriting(page);

  await expect(page.getByPlaceholder('Start writing here…')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
});

test('submitting text shows AI feedback section', async ({ page }) => {
  await mockTask(page);
  await mockAnalyzeStream(page);

  await page.goto('/writing');
  await startWriting(page);

  await page.getByPlaceholder('Start writing here…').fill(
    'She go to the store yesterday and buyed many things for her family.',
  );
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByRole('heading', { name: 'Result' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('heading', { name: 'Detailed feedback' })).toBeVisible();
});

test('submit is disabled below the minimum word count', async ({ page }) => {
  await mockTask(page);

  await page.goto('/writing');
  await startWriting(page);

  await page.getByPlaceholder('Start writing here…').fill('Hi');
  await expect(page.getByRole('button', { name: 'Submit' })).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'Result' })).not.toBeVisible();
});

test('streamed feedback renders detailed criteria after submission', async ({ page }) => {
  await mockTask(page);
  await mockAnalyzeStream(page);

  await page.goto('/writing');
  await startWriting(page);

  await page.getByPlaceholder('Start writing here…').fill(
    'She go to the store yesterday and buyed many things for her family.',
  );
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByText('Good coverage.')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Solid attempt with a few grammar issues.')).toBeVisible();
});
