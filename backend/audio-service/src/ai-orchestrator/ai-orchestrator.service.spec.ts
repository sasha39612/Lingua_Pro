import { vi, type Mocked } from 'vitest';

vi.mock('axios');

import axios from 'axios';
const mockedAxios = axios as Mocked<typeof axios>;

import { AiOrchestratorService } from './ai-orchestrator.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeService(orchestratorUrl?: string) {
  const orig = process.env.AI_ORCHESTRATOR_URL;

  if (orchestratorUrl !== undefined) process.env.AI_ORCHESTRATOR_URL = orchestratorUrl;
  else delete process.env.AI_ORCHESTRATOR_URL;

  const service = new AiOrchestratorService();

  if (orig !== undefined) process.env.AI_ORCHESTRATOR_URL = orig;
  else delete process.env.AI_ORCHESTRATOR_URL;

  return service;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AiOrchestratorService', () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── analyzeAudio ──────────────────────────────────────────────────────────

  describe('analyzeAudio', () => {
    it('calls /audio/pronunciation/analyze and returns mapped result', async () => {
      const service = makeService('http://ai-orchestrator:4005');

      mockedAxios.post = vi.fn().mockResolvedValue({
        data: {
          pronunciationScore: 0.88,
          accuracyScore: 0.9,
          transcript: 'Hello world',
          feedback: 'Great job!',
          phonemeHints: ['/th/ in "think"'],
        },
      });

      const result = await service.analyzeAudio(
        Buffer.from('audio-data'),
        'audio/wav',
        'english',
        'Hello world',
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/audio/pronunciation/analyze'),
        expect.objectContaining({ language: 'english', referenceText: 'Hello world' }),
        expect.any(Object),
      );
      expect(result.pronunciationScore).toBe(0.88);
      expect(result.transcript).toBe('Hello world');
      expect(result.feedback).toBe('Great job!');
      expect(result.phonemeHints).toEqual(['/th/ in "think"']);
      expect(result.confidence).toBe(0.9); // mapped from accuracyScore
    });

    it('returns local fallback when no orchestratorUrl is set', async () => {
      const service = makeService(undefined);

      const result = await service.analyzeAudio(Buffer.from('data'), 'audio/wav', 'english');

      expect(result.pronunciationScore).toBeGreaterThan(0);
      expect(result.pronunciationScore).toBeLessThanOrEqual(1);
      expect(typeof result.feedback).toBe('string');
      expect(Array.isArray(result.phonemeHints)).toBe(true);
    });

    it('falls back to local when orchestrator call throws', async () => {
      const service = makeService('http://ai-orchestrator:4005');
      mockedAxios.post = vi.fn().mockRejectedValue(new Error('timeout'));

      const result = await service.analyzeAudio(Buffer.from('data'), 'audio/wav', 'english');

      expect(typeof result.pronunciationScore).toBe('number');
      expect(typeof result.feedback).toBe('string');
    });

    it('falls back when orchestrator returns no pronunciationScore', async () => {
      const service = makeService('http://ai-orchestrator:4005');
      mockedAxios.post = vi.fn().mockResolvedValue({ data: {} });

      const result = await service.analyzeAudio(Buffer.from('data'), 'audio/wav', 'english');

      expect(typeof result.pronunciationScore).toBe('number');
    });

    it('returns language-specific phonemeHints in fallback for english', async () => {
      const service = makeService(undefined);

      const result = await service.analyzeAudio(Buffer.from('data'), 'audio/wav', 'english');
      const hints = result.phonemeHints.join(' ');
      expect(hints).toMatch(/th|consonant/i);
    });

    it('returns language-specific phonemeHints in fallback for german', async () => {
      const service = makeService(undefined);

      const result = await service.analyzeAudio(Buffer.from('data'), 'audio/wav', 'german');
      const hints = result.phonemeHints.join(' ');
      expect(hints).toContain('ich');
    });
  });
});
