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

  // ─── generateTask ──────────────────────────────────────────────────────────

  describe('generateTask', () => {
    it('calls /tasks/generate and returns first task', async () => {
      const service = makeService('http://ai-orchestrator:4005');

      const fakeTask = {
        language: 'english',
        level: 'B1',
        skill: 'listening',
        prompt: 'Listen and choose the best answer.',
        referenceText: 'The speaker is discussing travel plans.',
        answerOptions: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'B',
        audioUrl: null,
        focusPhonemes: null,
      };
      mockedAxios.post = vi.fn().mockResolvedValue({ data: { tasks: [fakeTask] } });

      const result = await service.generateTask('english', 'B1', 'listening');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/generate'),
        { language: 'english', level: 'B1', skill: 'listening' },
        expect.any(Object),
      );
      expect(result).toEqual(fakeTask);
    });

    it('returns local fallback when no orchestratorUrl is set', async () => {
      const service = makeService(undefined);

      const result = await service.generateTask('german', 'A2', 'listening');

      expect(result).not.toBeNull();
      expect(result!.language).toBe('german');
      expect(result!.level).toBe('A2');
      expect(result!.skill).toBe('listening');
      expect(Array.isArray(result!.answerOptions)).toBe(true);
    });

    it('returns local fallback when orchestrator call throws', async () => {
      const service = makeService('http://ai-orchestrator:4005');
      mockedAxios.post = vi.fn().mockRejectedValue(new Error('timeout'));

      const result = await service.generateTask('english', 'B1');

      expect(result).not.toBeNull();
      expect(typeof result!.prompt).toBe('string');
    });

    it('returns local fallback when orchestrator returns empty tasks array', async () => {
      const service = makeService('http://ai-orchestrator:4005');
      mockedAxios.post = vi.fn().mockResolvedValue({ data: { tasks: [] } });

      const result = await service.generateTask('english', 'B1');

      expect(result).not.toBeNull();
    });

    it('defaults skill to "listening" when not provided', async () => {
      const service = makeService('http://ai-orchestrator:4005');
      mockedAxios.post = vi.fn().mockResolvedValue({ data: { tasks: [{ language: 'english', level: 'B1', skill: 'listening', prompt: 'p', answerOptions: [], correctAnswer: null, audioUrl: null, referenceText: null, focusPhonemes: null }] } });

      await service.generateTask('english', 'B1');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ skill: 'listening' }),
        expect.any(Object),
      );
    });
  });

  // ─── synthesizeSpeech ──────────────────────────────────────────────────────

  describe('synthesizeSpeech', () => {
    it('calls /audio/tts and returns mapped TTS result', async () => {
      const service = makeService('http://ai-orchestrator:4005');
      mockedAxios.post = vi.fn().mockResolvedValue({
        data: { audioBase64: 'BASE64MP3', mimeType: 'audio/mpeg', durationEstimateMs: 4000 },
      });

      const result = await service.synthesizeSpeech('Hello world', 'english');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/audio/tts'),
        { text: 'Hello world', language: 'english' },
        expect.any(Object),
      );
      expect(result.audioBase64).toBe('BASE64MP3');
      expect(result.mimeType).toBe('audio/mpeg');
      expect(result.durationEstimateMs).toBe(4000);
    });

    it('returns null result when no orchestratorUrl is set', async () => {
      const service = makeService(undefined);

      const result = await service.synthesizeSpeech('Hello world', 'english');

      expect(result.audioBase64).toBeNull();
      expect(result.mimeType).toBeNull();
      expect(result.durationEstimateMs).toBeNull();
    });

    it('returns null result when orchestrator call throws', async () => {
      const service = makeService('http://ai-orchestrator:4005');
      mockedAxios.post = vi.fn().mockRejectedValue(new Error('TTS service down'));

      const result = await service.synthesizeSpeech('Hello world', 'english');

      expect(result.audioBase64).toBeNull();
    });

    it('returns null result when orchestrator returns no audioBase64', async () => {
      const service = makeService('http://ai-orchestrator:4005');
      mockedAxios.post = vi.fn().mockResolvedValue({ data: {} });

      const result = await service.synthesizeSpeech('Hello', 'english');

      expect(result.audioBase64).toBeNull();
    });
  });
});
