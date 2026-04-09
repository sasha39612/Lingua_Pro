import { vi } from 'vitest';

vi.mock('@nestjs/common', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    Logger: vi.fn(function () {
      return { warn: vi.fn(), log: vi.fn(), error: vi.fn() };
    }),
  };
});

async function makeService() {
  const orig = process.env.AI_API_KEY;
  delete process.env.AI_API_KEY;
  vi.resetModules();
  const { TaskService } = await import('./task.service');
  const svc = new TaskService();
  if (orig !== undefined) process.env.AI_API_KEY = orig;
  return svc;
}

describe('TaskService — local fallbacks (no AI_API_KEY)', () => {
  it('returns 1 reading exercise with questions array', async () => {
    const svc = await makeService();
    const tasks = await svc.generateTasks('English', 'A1', 'reading');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].skill).toBe('reading');
    expect(Array.isArray(tasks[0].questions)).toBe(true);
    expect((tasks[0].questions as any[]).length).toBeGreaterThan(0);
  });

  it('each task has required shape', async () => {
    const svc = await makeService();
    const tasks = await svc.generateTasks('English', 'B1', 'writing');
    expect(tasks).toHaveLength(1);
    const task = tasks[0];
    // Writing tasks store a structured WritingTask JSON in prompt; no answer options
    expect(task).toMatchObject({
      language: 'English',
      level: 'B1',
      skill: 'writing',
      prompt: expect.any(String),
      answerOptions: [],
      correctAnswer: null,
    });
    // prompt must be valid JSON with the required WritingTask fields
    const parsed = JSON.parse(task.prompt);
    expect(typeof parsed.situation).toBe('string');
    expect(Array.isArray(parsed.taskPoints)).toBe(true);
    expect(parsed.taskPoints.length).toBeGreaterThan(0);
    expect(typeof parsed.wordCountMin).toBe('number');
    expect(typeof parsed.wordCountMax).toBe('number');
  });

  it('normalizes empty language to "English"', async () => {
    const svc = await makeService();
    const tasks = await svc.generateTasks('', 'A1');
    expect(tasks[0].language).toBe('English');
  });

  it('normalizes empty level to "A1"', async () => {
    const svc = await makeService();
    const tasks = await svc.generateTasks('German', '');
    expect(tasks[0].level).toBe('A1');
  });

  it('defaults skill to "reading" when omitted', async () => {
    const svc = await makeService();
    const tasks = await svc.generateTasks('English', 'A2');
    expect(tasks[0].skill).toBe('reading');
  });

  it('falls back to local when GPT returns empty tasks array', async () => {
    vi.doMock('openai', () => ({
      default: vi.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: JSON.stringify({ tasks: [] }) } }],
            }),
          },
        },
      })),
    }));
    process.env.AI_API_KEY = 'test-key';

    const { TaskService: Fresh } = await import('./task.service');
    const svc = new Fresh();
    const tasks = await svc.generateTasks('English', 'A1', 'reading');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].skill).toBe('reading');

    vi.doUnmock('openai');
    delete process.env.AI_API_KEY;
  });
});
