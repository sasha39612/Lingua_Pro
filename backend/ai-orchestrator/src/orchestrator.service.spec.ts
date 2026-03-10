import { vi } from 'vitest';
import { OrchestratorService } from './orchestrator.service';

// NestJS Logger — allow it to run but silence output during tests
vi.mock('@nestjs/common', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    Logger: vi.fn(function () {
      return { warn: vi.fn(), log: vi.fn(), error: vi.fn() };
    }),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeService(): OrchestratorService {
  // Ensure no AI_API_KEY so openai is null → all tests hit local fallbacks
  const orig = process.env.AI_API_KEY;
  delete process.env.AI_API_KEY;
  const svc = new OrchestratorService();
  if (orig !== undefined) process.env.AI_API_KEY = orig;
  return svc;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OrchestratorService — local fallbacks (no AI_API_KEY)', () => {
  let service: OrchestratorService;

  beforeEach(() => {
    service = makeService();
  });

  // ─── analyzeText ──────────────────────────────────────────────────────────

  describe('analyzeText', () => {
    it('returns textScore=0.5 and prompt for empty text', async () => {
      const result = await service.analyzeText('', 'English');
      expect(result.textScore).toBe(0.5);
      expect(result.correctedText).toBe('');
      expect(result.feedback).toContain('English');
    });

    it('returns textScore=0.5 for whitespace-only text', async () => {
      const result = await service.analyzeText('   ', 'English');
      expect(result.textScore).toBe(0.5);
    });

    it('corrects "studing" → "studying" and lowers score', async () => {
      const result = await service.analyzeText('I am studing English.', 'English');
      expect(result.correctedText).toContain('studying');
      expect(result.textScore).toBe(0.82);
    });

    it('adds terminal punctuation when missing', async () => {
      const result = await service.analyzeText('Hello world', 'English');
      expect(result.correctedText).toMatch(/[.!?]$/);
    });

    it('returns score 0.95 when text needs no correction', async () => {
      const result = await service.analyzeText('Hello world.', 'English');
      expect(result.textScore).toBe(0.95);
    });

    it('includes language prefix in feedback', async () => {
      const result = await service.analyzeText('Hallo Welt.', 'German');
      expect(result.feedback).toContain('[German]');
    });
  });

  // ─── generateTasks ────────────────────────────────────────────────────────

  describe('generateTasks', () => {
    it('returns exactly 3 tasks', async () => {
      const tasks = await service.generateTasks('English', 'A1', 'reading');
      expect(tasks).toHaveLength(3);
    });

    it('each task has required shape', async () => {
      const tasks = await service.generateTasks('English', 'B1', 'writing');
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
      const tasks = await service.generateTasks('', 'A1');
      expect(tasks[0].language).toBe('English');
    });

    it('normalizes empty level to "A1"', async () => {
      const tasks = await service.generateTasks('German', '');
      expect(tasks[0].level).toBe('A1');
    });

    it('defaults skill to "reading" when omitted', async () => {
      const tasks = await service.generateTasks('English', 'A2');
      expect(tasks[0].skill).toBe('reading');
    });
  });

  // ─── transcribeAudio ─────────────────────────────────────────────────────

  describe('transcribeAudio', () => {
    it('returns stub transcript when no buffer can be decoded', async () => {
      const result = await service.transcribeAudio('', 'audio/webm', 'English');
      expect(result.transcript).toContain('English');
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.language).toBe('English');
    });

    it('returns stub for invalid base64', async () => {
      const result = await service.transcribeAudio('not-base64!!!', 'audio/webm', 'German');
      expect(result.language).toBe('German');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('decodes valid base64 but still stubs (no openai)', async () => {
      const encoded = Buffer.from('fake audio bytes').toString('base64');
      const result = await service.transcribeAudio(encoded, 'audio/mp3', 'Polish');
      // Still returns stub because openai is null
      expect(result.language).toBe('Polish');
    });
  });

  // ─── evaluatePronunciation ────────────────────────────────────────────────

  describe('evaluatePronunciation', () => {
    it('returns high score when transcript matches reference exactly', async () => {
      const result = await service.evaluatePronunciation(
        'Hello world',
        'English',
        undefined,
        'Hello world',
      );
      expect(result.pronunciationScore).toBeGreaterThan(0.85);
      expect(result.feedback).toContain('Strong pronunciation');
    });

    it('returns lower score when transcript differs from reference', async () => {
      const result = await service.evaluatePronunciation(
        'The quick brown fox',
        'English',
        undefined,
        'xyz abc qwerty bloop',
      );
      expect(result.pronunciationScore).toBeLessThan(0.85);
    });

    it('includes phoneme hints for English', async () => {
      const result = await service.evaluatePronunciation('test', 'English', undefined, 'test');
      expect(result.phonemeHints.length).toBeGreaterThan(0);
      const hints = result.phonemeHints.join(' ');
      expect(hints).toMatch(/th|w|v|consonant/i);
    });

    it('includes phoneme hints for German', async () => {
      const result = await service.evaluatePronunciation('Hallo', 'German', undefined, 'Hallo');
      const hints = result.phonemeHints.join(' ');
      expect(hints).toContain('ich');
    });

    it('returns transcript in result', async () => {
      const result = await service.evaluatePronunciation(
        'Hello',
        'English',
        undefined,
        'Hello there',
      );
      expect(result.transcript).toBe('Hello there');
    });

    it('score is clamped between 0.4 and 0.98', async () => {
      const result = await service.evaluatePronunciation('x', 'English', undefined, 'completely different');
      expect(result.pronunciationScore).toBeGreaterThanOrEqual(0.4);
      expect(result.pronunciationScore).toBeLessThanOrEqual(0.98);
    });
  });

  // ─── normalizeScore / safeJsonParse (via analyzeText with mocked openai) ──

  describe('normalizeScore edge cases (via local path)', () => {
    it('textScore from local analysis is between 0 and 1', async () => {
      const result = await service.analyzeText('Some text.', 'English');
      expect(result.textScore).toBeGreaterThanOrEqual(0);
      expect(result.textScore).toBeLessThanOrEqual(1);
    });
  });
});

// ─── Tests with mocked OpenAI ─────────────────────────────────────────────────

describe('OrchestratorService — with OpenAI mocked', () => {
  const mockCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AI_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.AI_API_KEY;
  });

  it('analyzeText falls back to local when OpenAI throws', async () => {
    vi.doMock('openai', () => ({
      default: vi.fn().mockImplementation(() => ({
        chat: { completions: { create: vi.fn().mockRejectedValue(new Error('API down')) } },
      })),
    }));

    // Re-require service after mock is set up
    const { OrchestratorService: Fresh } = await import('./orchestrator.service');
    const svc = new Fresh();
    const result = await svc.analyzeText('Hello world.', 'English');
    // Falls back to local analysis
    expect(result.textScore).toBeDefined();
    expect(typeof result.feedback).toBe('string');

    vi.doUnmock('openai');
  });

  it('generateTasks falls back to local when OpenAI returns empty tasks array', async () => {
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

    const { OrchestratorService: Fresh } = await import('./orchestrator.service');
    const svc = new Fresh();
    const tasks = await svc.generateTasks('English', 'A1', 'reading');
    expect(tasks).toHaveLength(3); // local fallback

    vi.doUnmock('openai');
  });
});
