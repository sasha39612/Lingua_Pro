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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function makeService() {
  const orig = process.env.AI_API_KEY;
  delete process.env.AI_API_KEY;
  vi.resetModules();
  const { TextAiService } = await import('./text-ai.service');
  // Provide a no-op AiUsageService stub so logging doesn't throw
  const aiUsageStub = { log: vi.fn().mockResolvedValue(undefined) } as any;
  const svc = new TextAiService(aiUsageStub);
  if (orig !== undefined) process.env.AI_API_KEY = orig;
  return svc;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TextAiService — local fallbacks (no AI_API_KEY)', () => {
  it('returns textScore=0.5 and prompt for empty text', async () => {
    const svc = await makeService();
    const result = await svc.analyzeText('', 'English');
    expect(result.textScore).toBe(0.5);
    expect(result.correctedText).toBe('');
    expect(result.feedback).toContain('English');
  }, 15_000);

  it('returns textScore=0.5 for whitespace-only text', async () => {
    const svc = await makeService();
    const result = await svc.analyzeText('   ', 'English');
    expect(result.textScore).toBe(0.5);
  });

  it('corrects "studing" → "studying" and lowers score', async () => {
    const svc = await makeService();
    const result = await svc.analyzeText('I am studing English.', 'English');
    expect(result.correctedText).toContain('studying');
    expect(result.textScore).toBe(0.82);
  });

  it('adds terminal punctuation when missing', async () => {
    const svc = await makeService();
    const result = await svc.analyzeText('Hello world', 'English');
    expect(result.correctedText).toMatch(/[.!?]$/);
  });

  it('returns score 0.95 when text needs no correction', async () => {
    const svc = await makeService();
    const result = await svc.analyzeText('Hello world.', 'English');
    expect(result.textScore).toBe(0.95);
  });

  it('includes language prefix in feedback', async () => {
    const svc = await makeService();
    const result = await svc.analyzeText('Hallo Welt.', 'German');
    expect(result.feedback).toContain('[German]');
  });

  it('textScore is between 0 and 1', async () => {
    const svc = await makeService();
    const result = await svc.analyzeText('Some text.', 'English');
    expect(result.textScore).toBeGreaterThanOrEqual(0);
    expect(result.textScore).toBeLessThanOrEqual(1);
  });

  describe('streamTextAnalysis', () => {
    it('emits status:analysis_started, result, status:analysis_complete in order', async () => {
      const svc = await makeService();
      const obs = svc.streamTextAnalysis('Hello world.', 'English');

      const events: any[] = [];
      await new Promise<void>((resolve) => {
        obs.subscribe({
          next: (e: any) => events.push(e.data),
          complete: resolve,
        });
      });

      expect(events).toHaveLength(3);
      expect(events[0]).toEqual({ type: 'status', message: 'analysis_started' });
      expect(events[1].type).toBe('result');
      expect(events[1].textScore).toBeDefined();
      expect(events[2]).toEqual({ type: 'status', message: 'analysis_complete' });
    });
  });
});
