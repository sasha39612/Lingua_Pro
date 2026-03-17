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
  it('returns exactly 3 tasks', async () => {
    const svc = await makeService();
    const tasks = await svc.generateTasks('English', 'A1', 'reading');
    expect(tasks).toHaveLength(3);
  });

  it('each task has required shape', async () => {
    const svc = await makeService();
    const tasks = await svc.generateTasks('English', 'B1', 'writing');
    for (const task of tasks) {
      expect(task).toMatchObject({
        language: 'English',
        level: 'B1',
        skill: 'writing',
        prompt: expect.any(String),
        answerOptions: expect.arrayContaining([expect.any(String)]),
        correctAnswer: expect.stringMatching(/^[A-D]$/),
      });
      expect(task.answerOptions).toHaveLength(4);
    }
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
    expect(tasks).toHaveLength(3);

    vi.doUnmock('openai');
    delete process.env.AI_API_KEY;
  });
});
