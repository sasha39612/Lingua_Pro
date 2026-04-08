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
  getNextListeningTask: vi.fn(),
  createTask: vi.fn(),
  upsertListeningScore: vi.fn(),
  updateTaskAudio: vi.fn(),
};

const mockAiOrchestrator = {
  analyzeAudio: vi.fn(),
  generateTask: vi.fn(),
  synthesizeSpeech: vi.fn(),
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

  // ─── getListeningTask ────────────────────────────────────────────────────────

  describe('getListeningTask', () => {
    const fakeTaskWithAudio = {
      id: 10,
      language: 'english',
      level: 'B1',
      skill: 'listening',
      prompt: 'Listen and answer',
      audioUrl: 'data:audio/mpeg;base64,AAAA',
      referenceText: 'The speaker talks about travel.',
      answerOptions: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'A',
      createdAt: new Date(),
    };

    const fakeTaskNoAudio = { ...fakeTaskWithAudio, id: 11, audioUrl: null };

    const fakeTts = { audioBase64: 'BASE64DATA', mimeType: 'audio/mpeg', durationEstimateMs: 3000 };

    beforeEach(() => {
      mockAudioRepository.getNextListeningTask.mockResolvedValue(null);
      mockAudioRepository.createTask.mockResolvedValue(fakeTaskWithAudio);
      mockAudioRepository.updateTaskAudio.mockResolvedValue(undefined);
      mockAiOrchestrator.generateTask.mockResolvedValue({
        language: 'english',
        level: 'B1',
        skill: 'listening',
        prompt: 'Listen and answer',
        referenceText: 'The speaker talks about travel.',
        answerOptions: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'A',
        audioUrl: null,
        focusPhonemes: null,
      });
      mockAiOrchestrator.synthesizeSpeech.mockResolvedValue(fakeTts);
    });

    it('returns existing task directly when it has audioUrl', async () => {
      mockAudioRepository.getNextListeningTask.mockResolvedValue(fakeTaskWithAudio);

      const result = await service.getListeningTask('42', 'english', 'B1');

      expect(mockAudioRepository.getNextListeningTask).toHaveBeenCalledWith(42, 'english', 'B1');
      expect(mockAiOrchestrator.generateTask).not.toHaveBeenCalled();
      expect(result.taskId).toBe(10);
      expect(result.audioUrl).toBe('data:audio/mpeg;base64,AAAA');
      expect(result.audioBase64).toBe('AAAA');
      expect(result.answerOptions).toEqual(fakeTaskWithAudio.answerOptions);
    });

    it('synthesizes audio and backfills when existing task has no audioUrl', async () => {
      mockAudioRepository.getNextListeningTask.mockResolvedValue(fakeTaskNoAudio);

      const result = await service.getListeningTask('42', 'english', 'B1');

      expect(mockAiOrchestrator.synthesizeSpeech).toHaveBeenCalledWith(
        fakeTaskNoAudio.referenceText,
        'english',
      );
      expect(mockAudioRepository.updateTaskAudio).toHaveBeenCalledWith(
        11,
        'data:audio/mpeg;base64,BASE64DATA',
      );
      expect(result.taskId).toBe(11);
      expect(result.audioBase64).toBe('BASE64DATA');
      expect(result.durationEstimateMs).toBe(3000);
    });

    it('returns task without audio when existing task has no audioUrl and TTS fails', async () => {
      mockAudioRepository.getNextListeningTask.mockResolvedValue(fakeTaskNoAudio);
      mockAiOrchestrator.synthesizeSpeech.mockResolvedValue({ audioBase64: null, mimeType: null, durationEstimateMs: null });

      const result = await service.getListeningTask('42', 'english', 'B1');

      expect(result.taskId).toBe(11);
      expect(result.audioBase64).toBeNull();
      expect(result.audioUrl).toBeNull();
    });

    it('generates new task + TTS and saves when no existing task found', async () => {
      mockAudioRepository.getNextListeningTask.mockResolvedValue(null);

      const result = await service.getListeningTask('42', 'english', 'B1');

      expect(mockAiOrchestrator.generateTask).toHaveBeenCalledWith('english', 'B1', 'listening');
      expect(mockAiOrchestrator.synthesizeSpeech).toHaveBeenCalledWith(
        'The speaker talks about travel.',
        'english',
      );
      expect(mockAudioRepository.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'english',
          level: 'B1',
          skill: 'listening',
          audioUrl: 'data:audio/mpeg;base64,BASE64DATA',
        }),
      );
      expect(result.taskId).toBe(fakeTaskWithAudio.id);
      expect(result.audioBase64).toBe('BASE64DATA');
    });

    it('normalizes language to lowercase before querying', async () => {
      mockAudioRepository.getNextListeningTask.mockResolvedValue(null);

      await service.getListeningTask('42', 'English', 'B1');

      expect(mockAudioRepository.getNextListeningTask).toHaveBeenCalledWith(42, 'english', 'B1');
    });

    it('generates new task with null audio when TTS fails on generation', async () => {
      mockAudioRepository.getNextListeningTask.mockResolvedValue(null);
      mockAiOrchestrator.synthesizeSpeech.mockResolvedValue({ audioBase64: null, mimeType: null, durationEstimateMs: null });

      const result = await service.getListeningTask('42', 'english', 'B1');

      expect(result.audioBase64).toBeNull();
      expect(result.audioUrl).toBeNull();
    });
  });

  // ─── submitListeningScore ────────────────────────────────────────────────────

  describe('submitListeningScore', () => {
    const fakeTask = {
      id: 10,
      prompt: 'Listen and answer',
      answerOptions: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'A',
      language: 'english',
      level: 'B1',
      skill: 'listening',
      audioUrl: null,
      referenceText: null,
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockAudioRepository.getTaskById.mockResolvedValue(fakeTask);
      mockAudioRepository.upsertListeningScore.mockResolvedValue(undefined);
    });

    it('returns score=1 and correct=total when answer matches correctAnswer', async () => {
      const result = await service.submitListeningScore('42', 10, ['A']);

      expect(result.score).toBe(1);
      expect(result.correct).toBe(4);
      expect(result.total).toBe(4);
      expect(mockAudioRepository.upsertListeningScore).toHaveBeenCalledWith(42, 10, 1);
    });

    it('returns score=0 when answer is wrong', async () => {
      const result = await service.submitListeningScore('42', 10, ['B']);

      expect(result.score).toBe(0);
      expect(result.correct).toBe(0);
      expect(result.total).toBe(4);
      expect(mockAudioRepository.upsertListeningScore).toHaveBeenCalledWith(42, 10, 0);
    });

    it('is case-insensitive when comparing answers', async () => {
      const result = await service.submitListeningScore('42', 10, ['a']);
      expect(result.score).toBe(1);
    });

    it('returns score=0 when task has no correctAnswer', async () => {
      mockAudioRepository.getTaskById.mockResolvedValue({ ...fakeTask, correctAnswer: null });

      const result = await service.submitListeningScore('42', 10, ['A']);
      expect(result.score).toBe(0);
      expect(result.correct).toBe(0);
    });

    it('throws when task is not found', async () => {
      mockAudioRepository.getTaskById.mockResolvedValue(null);

      await expect(service.submitListeningScore('42', 999, ['A'])).rejects.toThrow('Task not found');
    });

    it('persists score with parsed integer userId', async () => {
      await service.submitListeningScore('7', 10, ['A']);
      expect(mockAudioRepository.upsertListeningScore).toHaveBeenCalledWith(7, 10, expect.any(Number));
    });
  });
});
