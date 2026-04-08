import { vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AudioController } from './audio.controller';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeController() {
  const mockService = {
    processAudio: vi.fn(),
    getAudioRecords: vi.fn(),
    getAudioRecord: vi.fn(),
    getUserStats: vi.fn(),
    getListeningTasks: vi.fn(),
    getRecordsByLanguage: vi.fn(),
    evaluateComprehension: vi.fn(),
    generateComprehension: vi.fn(),
    getListeningTask: vi.fn(),
    submitListeningAnswers: vi.fn(),
  };
  const controller = new AudioController(mockService as any);
  return { controller, mockService };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AudioController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── POST /audio/check ─────────────────────────────────────────────────────

  describe('checkAudio', () => {
    const validBody = {
      userId: '42',
      language: 'english',
      audioUrl: 'https://example.com/audio.mp3',
    };

    it('delegates to service and returns result', async () => {
      const { controller, mockService } = makeController();
      const expected = { id: 1, transcript: 'Hello', pronunciationScore: 0.9 };
      mockService.processAudio.mockResolvedValue(expected);

      const result = await controller.checkAudio(validBody);

      expect(mockService.processAudio).toHaveBeenCalledWith('42', 'english', 'https://example.com/audio.mp3', undefined);
      expect(result).toEqual(expected);
    });

    it('passes expectedText when provided', async () => {
      const { controller, mockService } = makeController();
      mockService.processAudio.mockResolvedValue({});

      await controller.checkAudio({ ...validBody, expectedText: 'Hello world' });

      expect(mockService.processAudio).toHaveBeenCalledWith('42', 'english', 'https://example.com/audio.mp3', 'Hello world');
    });

    it('throws BadRequestException when userId is missing', async () => {
      const { controller } = makeController();
      await expect(
        controller.checkAudio({ userId: '', language: 'english', audioUrl: 'https://x.com/a.mp3' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when language is missing', async () => {
      const { controller } = makeController();
      await expect(
        controller.checkAudio({ userId: '1', language: '', audioUrl: 'https://x.com/a.mp3' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when audioUrl is missing', async () => {
      const { controller } = makeController();
      await expect(
        controller.checkAudio({ userId: '1', language: 'english', audioUrl: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('propagates service errors', async () => {
      const { controller, mockService } = makeController();
      mockService.processAudio.mockRejectedValue(new Error('Whisper timeout'));

      await expect(controller.checkAudio(validBody)).rejects.toThrow('Whisper timeout');
    });
  });

  // ─── GET /audio/records/:userId ────────────────────────────────────────────

  describe('getAudioRecords', () => {
    it('returns records for the given userId', async () => {
      const { controller, mockService } = makeController();
      const records = [{ id: 1 }, { id: 2 }];
      mockService.getAudioRecords.mockResolvedValue(records);

      const result = await controller.getAudioRecords('7');

      expect(mockService.getAudioRecords).toHaveBeenCalledWith('7');
      expect(result).toEqual(records);
    });
  });

  // ─── GET /audio/record/:id ─────────────────────────────────────────────────

  describe('getAudioRecord', () => {
    it('returns single record', async () => {
      const { controller, mockService } = makeController();
      mockService.getAudioRecord.mockResolvedValue({ id: 5 });

      const result = await controller.getAudioRecord('5');

      expect(mockService.getAudioRecord).toHaveBeenCalledWith('5');
      expect(result).toEqual({ id: 5 });
    });
  });

  // ─── GET /audio/stats/:userId ──────────────────────────────────────────────

  describe('getUserStats', () => {
    it('returns stats for the given userId', async () => {
      const { controller, mockService } = makeController();
      const stats = { totalRecords: 3, averagePronunciationScore: 0.85, languages: ['english'] };
      mockService.getUserStats.mockResolvedValue(stats);

      const result = await controller.getUserStats('42');

      expect(mockService.getUserStats).toHaveBeenCalledWith('42');
      expect(result).toEqual(stats);
    });
  });

  // ─── GET /audio/listening-tasks ────────────────────────────────────────────

  describe('getListeningTasks', () => {
    it('returns tasks for the given language', async () => {
      const { controller, mockService } = makeController();
      const tasks = [{ id: 1, prompt: 'Listen and answer' }];
      mockService.getListeningTasks.mockResolvedValue(tasks);

      const result = await controller.getListeningTasks('english');

      expect(mockService.getListeningTasks).toHaveBeenCalledWith('english', undefined);
      expect(result).toEqual(tasks);
    });

    it('passes level when provided', async () => {
      const { controller, mockService } = makeController();
      mockService.getListeningTasks.mockResolvedValue([]);

      await controller.getListeningTasks('german', 'B2');

      expect(mockService.getListeningTasks).toHaveBeenCalledWith('german', 'B2');
    });

    it('throws BadRequestException when language is missing', async () => {
      const { controller } = makeController();
      await expect(controller.getListeningTasks('')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── GET /audio/by-language ────────────────────────────────────────────────

  describe('byLanguage', () => {
    it('returns records by language', async () => {
      const { controller, mockService } = makeController();
      mockService.getRecordsByLanguage.mockResolvedValue({ records: [] });

      const result = await controller.byLanguage('english');

      expect(mockService.getRecordsByLanguage).toHaveBeenCalledWith('english', undefined);
      expect(result).toEqual({ records: [] });
    });

    it('passes from param when provided', async () => {
      const { controller, mockService } = makeController();
      mockService.getRecordsByLanguage.mockResolvedValue({ records: [] });

      await controller.byLanguage('english', '2026-01-01');

      expect(mockService.getRecordsByLanguage).toHaveBeenCalledWith('english', '2026-01-01');
    });

    it('throws BadRequestException when language is missing', async () => {
      const { controller } = makeController();
      await expect(controller.byLanguage('')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── POST /audio/comprehension/evaluate ───────────────────────────────────

  describe('evaluateComprehension', () => {
    it('returns evaluation result', async () => {
      const { controller, mockService } = makeController();
      const evalResult = { isCorrect: true, score: 1, feedback: 'Correct!' };
      mockService.evaluateComprehension.mockResolvedValue(evalResult);

      const result = await controller.evaluateComprehension({ userAnswer: 'Berlin', correctAnswer: 'Berlin' });

      expect(mockService.evaluateComprehension).toHaveBeenCalledWith('Berlin', 'Berlin');
      expect(result).toEqual(evalResult);
    });

    it('throws BadRequestException when userAnswer is missing', async () => {
      const { controller } = makeController();
      await expect(
        controller.evaluateComprehension({ userAnswer: '', correctAnswer: 'Berlin' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when correctAnswer is missing', async () => {
      const { controller } = makeController();
      await expect(
        controller.evaluateComprehension({ userAnswer: 'Berlin', correctAnswer: '' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── POST /audio/comprehension/generate ───────────────────────────────────

  describe('generateComprehension', () => {
    it('returns comprehension task', async () => {
      const { controller, mockService } = makeController();
      const task = { taskId: 5, prompt: 'Listen and answer', answerOptions: [], correctAnswer: 'A' };
      mockService.generateComprehension.mockResolvedValue(task);

      const result = await controller.generateComprehension({ taskId: '5' });

      expect(mockService.generateComprehension).toHaveBeenCalledWith('5');
      expect(result).toEqual(task);
    });

    it('throws BadRequestException when taskId is missing', async () => {
      const { controller } = makeController();
      await expect(controller.generateComprehension({ taskId: '' })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── GET /audio/listening-task ─────────────────────────────────────────────

  describe('getListeningTask', () => {
    const fakeTaskResult = {
      taskId: 10,
      prompt: 'Listen and answer',
      audioUrl: 'data:audio/mpeg;base64,AAAA',
      audioBase64: 'AAAA',
      mimeType: 'audio/mpeg',
      answerOptions: ['A', 'B', 'C', 'D'],
      durationEstimateMs: 3000,
    };

    it('delegates to service and returns task', async () => {
      const { controller, mockService } = makeController();
      mockService.getListeningTask.mockResolvedValue(fakeTaskResult);

      const result = await controller.getListeningTask('english', 'B1', '42');

      expect(mockService.getListeningTask).toHaveBeenCalledWith('42', 'english', 'B1');
      expect(result).toEqual(fakeTaskResult);
    });

    it('throws BadRequestException when language is missing', async () => {
      const { controller } = makeController();
      await expect(controller.getListeningTask('', 'B1', '42')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when level is missing', async () => {
      const { controller } = makeController();
      await expect(controller.getListeningTask('english', '', '42')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when x-user-id header is missing', async () => {
      const { controller } = makeController();
      await expect(controller.getListeningTask('english', 'B1', '')).rejects.toThrow(BadRequestException);
    });

    it('propagates service errors', async () => {
      const { controller, mockService } = makeController();
      mockService.getListeningTask.mockRejectedValue(new Error('Orchestrator down'));
      await expect(controller.getListeningTask('english', 'B1', '42')).rejects.toThrow('Orchestrator down');
    });
  });

  // ─── POST /audio/listening-answers ────────────────────────────────────────

  describe('submitListeningAnswers', () => {
    const fakeResult = {
      score: 0.8,
      correct: 4,
      total: 5,
      results: [
        { questionIndex: 0, question: 'Q1?', correct: true, userAnswer: 1, correctAnswer: 1, correctOptionText: 'Option B' },
      ],
    };

    it('delegates to service and returns result', async () => {
      const { controller, mockService } = makeController();
      mockService.submitListeningAnswers.mockResolvedValue(fakeResult);

      const result = await controller.submitListeningAnswers({ taskId: 10, answers: [1, 2, 3, 0, 1] }, '42');

      expect(mockService.submitListeningAnswers).toHaveBeenCalledWith('42', 10, [1, 2, 3, 0, 1]);
      expect(result).toEqual(fakeResult);
    });

    it('throws BadRequestException when taskId is missing', async () => {
      const { controller } = makeController();
      await expect(
        controller.submitListeningAnswers({ taskId: 0, answers: [0, 1, 2, 3, 0] }, '42'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when answers is not an array', async () => {
      const { controller } = makeController();
      await expect(
        controller.submitListeningAnswers({ taskId: 10, answers: 0 as any }, '42'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when x-user-id header is missing', async () => {
      const { controller } = makeController();
      await expect(
        controller.submitListeningAnswers({ taskId: 10, answers: [0, 1, 2, 3, 0] }, ''),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
