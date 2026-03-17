import { vi, type Mocked } from 'vitest';
import { AudioService } from './audio.service';

const mockAudioRepository = {
  createAudioRecord: vi.fn(),
  getAudioRecordsByUserId: vi.fn(),
  getAudioRecord: vi.fn(),
  getUserAudioStats: vi.fn(),
  getListeningTasks: vi.fn(),
  getRecordsByLanguage: vi.fn(),
  getTaskById: vi.fn(),
};

const mockAiOrchestrator = {
  analyzeAudio: vi.fn(),
};

vi.mock('axios');
import axios from 'axios';
const mockedAxios = axios as Mocked<typeof axios>;

describe('AudioService', () => {
  let service: AudioService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AudioService(mockAudioRepository as any, mockAiOrchestrator as any);
  });

  // ─── evaluateComprehension ───────────────────────────────────────────────────

  describe('evaluateComprehension', () => {
    it('returns correct=true when answers match (case-insensitive, trimmed)', async () => {
      const result = await service.evaluateComprehension('  Hello  ', 'hello');
      expect(result).toEqual({
        isCorrect: true,
        score: 1,
        feedback: 'Correct answer. Good listening comprehension.',
      });
    });

    it('returns correct=false when answers differ', async () => {
      const result = await service.evaluateComprehension('world', 'hello');
      expect(result).toEqual({
        isCorrect: false,
        score: 0,
        feedback: 'Incorrect answer. Replay the audio and try again.',
      });
    });

    it('returns error response when correctAnswer is empty', async () => {
      const result = await service.evaluateComprehension('anything', '');
      expect(result).toEqual({
        isCorrect: false,
        score: 0,
        feedback: 'Correct answer is missing for this task.',
      });
    });

    it('handles empty userAnswer (treated as wrong)', async () => {
      const result = await service.evaluateComprehension('', 'expected');
      expect(result.isCorrect).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  // ─── processAudio ────────────────────────────────────────────────────────────

  describe('processAudio', () => {
    const fakeBuffer = Buffer.from('fake-audio-data');
    const fakeRecord = {
      id: 1,
      userId: 42,
      language: 'english',
      transcript: 'Hello world',
      pronunciationScore: 0.88,
      feedback: 'Good pronunciation overall.',
      audioUrl: 'https://example.com/audio.mp3',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };

    beforeEach(() => {
      mockedAxios.get = vi.fn().mockResolvedValue({ data: fakeBuffer });
      mockAiOrchestrator.analyzeAudio.mockResolvedValue({
        transcript: 'Hello world',
        pronunciationScore: 0.88,
        feedback: 'Good pronunciation overall.',
        phonemeHints: ['Focus on vowel clarity'],
        confidence: 0.95,
      });
      mockAudioRepository.createAudioRecord.mockResolvedValue(fakeRecord);
    });

    it('downloads audio, calls orchestrator, saves record, returns result', async () => {
      const result = await service.processAudio('42', 'english', 'https://example.com/audio.mp3');

      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com/audio.mp3', { responseType: 'arraybuffer' });
      expect(mockAiOrchestrator.analyzeAudio).toHaveBeenCalledWith(
        expect.any(Buffer),
        'audio/wav',
        'english',
        undefined,
      );
      expect(mockAudioRepository.createAudioRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 42,
          language: 'english',
          transcript: 'Hello world',
          pronunciationScore: 0.88,
          audioUrl: 'https://example.com/audio.mp3',
        }),
      );

      expect(result).toMatchObject({
        id: 1,
        userId: 42,
        language: 'english',
        transcript: 'Hello world',
        pronunciationScore: 0.88,
        confidence: 0.95,
        phonemeHints: ['Focus on vowel clarity'],
      });
    });

    it('passes expectedText to analyzeAudio when provided', async () => {
      await service.processAudio('42', 'english', 'https://example.com/audio.mp3', 'Hello world');
      expect(mockAiOrchestrator.analyzeAudio).toHaveBeenCalledWith(
        expect.any(Buffer),
        'audio/wav',
        'english',
        'Hello world',
      );
    });

    it('propagates error from AI orchestrator', async () => {
      mockAiOrchestrator.analyzeAudio.mockRejectedValue(new Error('Orchestrator timeout'));
      await expect(service.processAudio('42', 'english', 'https://example.com/audio.mp3')).rejects.toThrow('Orchestrator timeout');
    });
  });

  // ─── getAudioRecords ─────────────────────────────────────────────────────────

  describe('getAudioRecords', () => {
    it('delegates to repository with parsed userId', async () => {
      mockAudioRepository.getAudioRecordsByUserId.mockResolvedValue([{ id: 1 }]);
      const result = await service.getAudioRecords('7');
      expect(mockAudioRepository.getAudioRecordsByUserId).toHaveBeenCalledWith(7);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  // ─── getRecordsByLanguage ─────────────────────────────────────────────────────

  describe('getRecordsByLanguage', () => {
    it('delegates with language and optional from param', async () => {
      mockAudioRepository.getRecordsByLanguage.mockResolvedValue({ records: [] });
      await service.getRecordsByLanguage('english', '2026-01-01');
      expect(mockAudioRepository.getRecordsByLanguage).toHaveBeenCalledWith('english', '2026-01-01');
    });

    it('delegates without from param when not provided', async () => {
      mockAudioRepository.getRecordsByLanguage.mockResolvedValue({ records: [] });
      await service.getRecordsByLanguage('german');
      expect(mockAudioRepository.getRecordsByLanguage).toHaveBeenCalledWith('german', undefined);
    });
  });

  // ─── generateComprehension ───────────────────────────────────────────────────

  describe('generateComprehension', () => {
    it('returns task data when found', async () => {
      const fakeTask = {
        id: 5,
        prompt: 'What is the capital of Germany?',
        answerOptions: ['Berlin', 'Munich', 'Hamburg'],
        correctAnswer: 'Berlin',
      };
      mockAudioRepository.getTaskById.mockResolvedValue(fakeTask);
      // Simulate DATABASE_URL being set
      const origEnv = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = await service.generateComprehension('5');
      expect(result).toEqual({
        taskId: 5,
        prompt: 'What is the capital of Germany?',
        answerOptions: ['Berlin', 'Munich', 'Hamburg'],
        correctAnswer: 'Berlin',
      });

      process.env.DATABASE_URL = origEnv;
    });

    it('returns fallback when DATABASE_URL is not set', async () => {
      const origEnv = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      const result = await service.generateComprehension('5');
      expect(result).toMatchObject({
        taskId: 5,
        prompt: expect.stringContaining('unavailable'),
        answerOptions: [],
        correctAnswer: null,
      });

      process.env.DATABASE_URL = origEnv;
    });

    it('throws when task is not found', async () => {
      mockAudioRepository.getTaskById.mockResolvedValue(null);
      const origEnv = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      await expect(service.generateComprehension('999')).rejects.toThrow('Listening task not found');

      process.env.DATABASE_URL = origEnv;
    });
  });
});
