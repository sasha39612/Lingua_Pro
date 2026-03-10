import { vi, type Mocked } from 'vitest';

vi.mock('axios');
vi.mock('form-data', () => ({
  default: vi.fn(function () {
    return {
      append: vi.fn(),
      getHeaders: vi.fn().mockReturnValue({ 'content-type': 'multipart/form-data' }),
    };
  }),
}));

import axios from 'axios';
const mockedAxios = axios as Mocked<typeof axios>;

import { AiOrchestratorService } from './ai-orchestrator.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeService(orchestratorUrl?: string, openaiKey?: string) {
  const origOrch = process.env.AI_ORCHESTRATOR_URL;
  const origKey = process.env.OPENAI_API_KEY;

  if (orchestratorUrl !== undefined) process.env.AI_ORCHESTRATOR_URL = orchestratorUrl;
  else delete process.env.AI_ORCHESTRATOR_URL;

  if (openaiKey !== undefined) process.env.OPENAI_API_KEY = openaiKey;
  else delete process.env.OPENAI_API_KEY;

  const service = new AiOrchestratorService();

  // restore
  if (origOrch !== undefined) process.env.AI_ORCHESTRATOR_URL = origOrch;
  else delete process.env.AI_ORCHESTRATOR_URL;
  if (origKey !== undefined) process.env.OPENAI_API_KEY = origKey;
  else delete process.env.OPENAI_API_KEY;

  return service;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AiOrchestratorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── processAudioWithWhisper ───────────────────────────────────────────────

  describe('processAudioWithWhisper', () => {
    it('returns transcript via orchestrator when orchestratorUrl is set', async () => {
      const service = makeService('http://ai-orchestrator:4005');
      const buf = Buffer.from('audio-data');

      mockedAxios.post = vi.fn().mockResolvedValue({
        data: { transcript: 'Hello world' },
      });

      const result = await service.processAudioWithWhisper(buf, 'english');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/audio/transcribe'),
        expect.objectContaining({ language: 'english' }),
        expect.any(Object),
      );
      expect(result.transcript).toBe('Hello world');
      expect(result.language).toBe('english');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('falls back to Whisper API when orchestrator call fails and key is set', async () => {
      const service = makeService('http://ai-orchestrator:4005', 'sk-test');

      mockedAxios.post = vi.fn()
        .mockRejectedValueOnce(new Error('orchestrator down'))   // orchestrator fails
        .mockResolvedValueOnce({ data: { text: 'Fallback transcript' } }); // whisper succeeds

      const buf = Buffer.from('audio-data');
      const result = await service.processAudioWithWhisper(buf, 'english');

      expect(result.transcript).toBe('Fallback transcript');
    });

    it('throws BadRequestException when no orchestrator url and no OpenAI key', async () => {
      const service = makeService(undefined, undefined);
      const buf = Buffer.from('data');

      await expect(service.processAudioWithWhisper(buf, 'english')).rejects.toThrow(
        'OPENAI_API_KEY is not configured',
      );
    });

    it('confidence is 0.5 for a short transcript (< 10 chars)', async () => {
      // The source returns 0.5 for transcripts shorter than 10 characters.
      // Orchestrator path: non-empty string is truthy so it is returned.
      const service = makeService('http://ai-orchestrator:4005');

      mockedAxios.post = vi.fn().mockResolvedValue({ data: { transcript: 'Hi' } });

      const result = await service.processAudioWithWhisper(Buffer.from('data'), 'english');
      expect(result.confidence).toBe(0.5);
    });
  });

  // ─── analyzePronunciation ──────────────────────────────────────────────────

  describe('analyzePronunciation', () => {
    it('returns score from orchestrator when available', async () => {
      const service = makeService('http://ai-orchestrator:4005');

      mockedAxios.post = vi.fn().mockResolvedValue({
        data: { score: 0.9, feedback: 'Excellent!', suggestions: ['Keep it up'] },
      });

      const result = await service.analyzePronunciation('Hello', 'english', 'Hello');

      expect(result.score).toBe(0.9);
      expect(result.feedback).toBe('Excellent!');
      expect(result.suggestions).toEqual(['Keep it up']);
    });

    it('uses fallback when no orchestratorUrl is set', async () => {
      const service = makeService(undefined, undefined);

      const result = await service.analyzePronunciation('Hello', 'english', 'Hello');

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(typeof result.feedback).toBe('string');
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('returns fallback score of 0.8 when no expectedText', async () => {
      const service = makeService(undefined, undefined);

      const result = await service.analyzePronunciation('Hello world', 'english');
      expect(result.score).toBe(0.8);
    });

    it('falls back when orchestrator call throws', async () => {
      const service = makeService('http://ai-orchestrator:4005');

      mockedAxios.post = vi.fn().mockRejectedValue(new Error('timeout'));

      const result = await service.analyzePronunciation('Hello', 'english', 'Hello');
      // fallback always returns a number score
      expect(typeof result.score).toBe('number');
    });

    it('score is between 0 and 1 in fallback mode', async () => {
      const service = makeService(undefined, undefined);

      const result = await service.analyzePronunciation('abc', 'english', 'completely different text');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('includes language-specific suggestions for english', async () => {
      const service = makeService(undefined, undefined);

      // low score to trigger general suggestions
      const result = await service.analyzePronunciation('x', 'english');
      const allSuggestions = result.suggestions.join(' ');
      expect(allSuggestions.length).toBeGreaterThan(0);
    });
  });
});
