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

const mockScores = {
  pronunciationScore: 0.75,
  accuracyScore: 0.78,
  fluencyScore: 0.72,
  completenessScore: 0.8,
};

async function makeService() {
  const orig = process.env.AI_API_KEY;
  delete process.env.AI_API_KEY;
  vi.resetModules();
  const { PronunciationAiService } = await import('./pronunciation-ai.service');
  const svc = new PronunciationAiService();
  if (orig !== undefined) process.env.AI_API_KEY = orig;
  return svc;
}

describe('PronunciationAiService — local fallbacks (no AI_API_KEY)', () => {
  it('returns feedback string and non-empty phonemeHints', async () => {
    const svc = await makeService();
    const result = await svc.generateFeedback('Hello world', 'Hello world', 'English', mockScores, []);
    expect(typeof result.feedback).toBe('string');
    expect(result.feedback.length).toBeGreaterThan(0);
    expect(Array.isArray(result.phonemeHints)).toBe(true);
    expect(result.phonemeHints.length).toBeGreaterThan(0);
  });

  it('returns "Strong pronunciation" feedback for high score', async () => {
    const svc = await makeService();
    const highScores = { ...mockScores, pronunciationScore: 0.9 };
    const result = await svc.generateFeedback('Hello', 'Hello', 'English', highScores, []);
    expect(result.feedback).toContain('Strong pronunciation');
  });

  it('returns improvement feedback for low score', async () => {
    const svc = await makeService();
    const lowScores = { ...mockScores, pronunciationScore: 0.5 };
    const result = await svc.generateFeedback('Hello', 'xyz', 'English', lowScores, []);
    expect(result.feedback).toContain('Pronunciation differs');
  });

  it('returns language-specific hints for German', async () => {
    const svc = await makeService();
    const result = await svc.generateFeedback('Hallo', 'Hallo', 'German', mockScores, []);
    expect(result.phonemeHints.join(' ')).toContain('ich');
  });

  it('does not return any numeric score fields', async () => {
    const svc = await makeService();
    const result = await svc.generateFeedback('Hello', 'Hello', 'English', mockScores, []);
    expect((result as any).pronunciationScore).toBeUndefined();
    expect((result as any).accuracyScore).toBeUndefined();
    expect((result as any).score).toBeUndefined();
  });

  it('does not throw for empty words array', async () => {
    const svc = await makeService();
    await expect(
      svc.generateFeedback('Hello world', '', 'English', mockScores, []),
    ).resolves.toBeDefined();
  });
});

describe('PronunciationAiService — GPT mock', () => {
  afterEach(() => {
    vi.doUnmock('openai');
    delete process.env.AI_API_KEY;
  });

  it('returns only feedback and phonemeHints — ignores any score GPT emits', async () => {
    vi.resetModules();
    vi.doMock('openai', () => ({
      default: vi.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    // GPT tries to emit a score — it must be silently ignored
                    content: JSON.stringify({
                      feedback: 'Great job!',
                      phonemeHints: ['/th/ in "think"'],
                      pronunciationScore: 0.99, // should be discarded
                    }),
                  },
                },
              ],
            }),
          },
        },
      })),
    }));
    process.env.AI_API_KEY = 'test-key';

    const { PronunciationAiService: Fresh } = await import('./pronunciation-ai.service');
    const svc = new Fresh();
    const result = await svc.generateFeedback('Hello', 'Hello', 'English', mockScores, []);

    expect(result.feedback).toBe('Great job!');
    expect(result.phonemeHints).toEqual(['/th/ in "think"']);
    expect((result as any).pronunciationScore).toBeUndefined();
  });

  it('falls back to local when GPT throws', async () => {
    vi.resetModules();
    vi.doMock('openai', () => ({
      default: vi.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('API down')),
          },
        },
      })),
    }));
    process.env.AI_API_KEY = 'test-key';

    const { PronunciationAiService: Fresh } = await import('./pronunciation-ai.service');
    const svc = new Fresh();
    const result = await svc.generateFeedback('Hello', 'Hello', 'English', mockScores, []);

    expect(typeof result.feedback).toBe('string');
    expect(result.phonemeHints.length).toBeGreaterThan(0);
  });
});
