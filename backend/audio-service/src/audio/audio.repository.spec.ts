import { vi } from 'vitest';
import { AudioRepository } from './audio.repository';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRepo() {
  const mockPrisma = {
    audioRecord: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  };
  const repo = new AudioRepository(mockPrisma as any);
  return { repo, mockPrisma };
}

const baseRecord = {
  id: 1,
  userId: 42,
  language: 'english',
  transcript: 'Hello world',
  pronunciationScore: 0.88,
  audioUrl: 'https://example.com/audio.mp3',
  feedback: 'Good',
  createdAt: new Date('2026-01-01'),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AudioRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── createAudioRecord ─────────────────────────────────────────────────────

  describe('createAudioRecord', () => {
    it('persists correct fields and returns created record', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.audioRecord.create.mockResolvedValue(baseRecord);

      const input = {
        userId: 42,
        language: 'english',
        transcript: 'Hello world',
        pronunciationScore: 0.88,
        audioUrl: 'https://example.com/audio.mp3',
        feedback: 'Good',
      };

      const result = await repo.createAudioRecord(input);

      expect(mockPrisma.audioRecord.create).toHaveBeenCalledWith({ data: input });
      expect(result).toEqual(baseRecord);
    });
  });

  // ─── getAudioRecord ────────────────────────────────────────────────────────

  describe('getAudioRecord', () => {
    it('returns record when found', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.audioRecord.findUnique.mockResolvedValue(baseRecord);

      const result = await repo.getAudioRecord(1);

      expect(mockPrisma.audioRecord.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(baseRecord);
    });

    it('returns null when record not found', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.audioRecord.findUnique.mockResolvedValue(null);

      const result = await repo.getAudioRecord(999);
      expect(result).toBeNull();
    });
  });

  // ─── getAudioRecordsByUserId ───────────────────────────────────────────────

  describe('getAudioRecordsByUserId', () => {
    it('returns records ordered by createdAt desc', async () => {
      const { repo, mockPrisma } = makeRepo();
      const records = [baseRecord, { ...baseRecord, id: 2 }];
      mockPrisma.audioRecord.findMany.mockResolvedValue(records);

      const result = await repo.getAudioRecordsByUserId(42);

      expect(mockPrisma.audioRecord.findMany).toHaveBeenCalledWith({
        where: { userId: 42 },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(records);
    });

    it('returns empty array when user has no records', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.audioRecord.findMany.mockResolvedValue([]);

      const result = await repo.getAudioRecordsByUserId(99);
      expect(result).toEqual([]);
    });
  });

  // ─── getUserAudioStats ─────────────────────────────────────────────────────

  describe('getUserAudioStats', () => {
    it('returns zeros and empty languages when user has no records', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.audioRecord.findMany.mockResolvedValue([]);

      const result = await repo.getUserAudioStats(42);

      expect(result).toEqual({
        totalRecords: 0,
        averagePronunciationScore: 0,
        languages: [],
      });
    });

    it('calculates correct averages and unique languages', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.audioRecord.findMany.mockResolvedValue([
        { ...baseRecord, pronunciationScore: 0.8, language: 'english' },
        { ...baseRecord, id: 2, pronunciationScore: 0.6, language: 'german' },
        { ...baseRecord, id: 3, pronunciationScore: 0.9, language: 'english' },
      ]);

      const result = await repo.getUserAudioStats(42);

      expect(result.totalRecords).toBe(3);
      expect(result.averagePronunciationScore).toBeCloseTo((0.8 + 0.6 + 0.9) / 3);
      expect(result.languages).toHaveLength(2);
      expect(result.languages).toContain('english');
      expect(result.languages).toContain('german');
    });

    it('handles null pronunciationScore values', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.audioRecord.findMany.mockResolvedValue([
        { ...baseRecord, pronunciationScore: null },
      ]);

      const result = await repo.getUserAudioStats(42);
      expect(result.averagePronunciationScore).toBe(0);
    });
  });

  // ─── getRecordsByLanguage ──────────────────────────────────────────────────

  describe('getRecordsByLanguage', () => {
    it('filters by language only when no from date', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.audioRecord.findMany.mockResolvedValue([]);

      await repo.getRecordsByLanguage('english');

      expect(mockPrisma.audioRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { language: 'english' } }),
      );
    });

    it('adds createdAt filter when from date is provided', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.audioRecord.findMany.mockResolvedValue([]);

      await repo.getRecordsByLanguage('german', '2026-01-01');

      expect(mockPrisma.audioRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ createdAt: expect.any(Object) }),
        }),
      );
    });

    it('returns records wrapped in { records } object', async () => {
      const { repo, mockPrisma } = makeRepo();
      const rows = [{ pronunciationScore: 0.8, feedback: 'ok', createdAt: new Date() }];
      mockPrisma.audioRecord.findMany.mockResolvedValue(rows);

      const result = await repo.getRecordsByLanguage('english');
      expect(result).toEqual({ records: rows });
    });
  });

  // ─── getListeningTasks ─────────────────────────────────────────────────────

  describe('getListeningTasks', () => {
    it('filters by language and skill=listening', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.task.findMany.mockResolvedValue([]);

      await repo.getListeningTasks('english');

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ language: 'english', skill: 'listening' }),
        }),
      );
    });

    it('adds level filter when provided', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.task.findMany.mockResolvedValue([]);

      await repo.getListeningTasks('english', 'B1');

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ level: 'B1' }),
        }),
      );
    });

    it('does not add level filter when omitted', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.task.findMany.mockResolvedValue([]);

      await repo.getListeningTasks('english');

      const call = mockPrisma.task.findMany.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('level');
    });
  });

  // ─── getTaskById ───────────────────────────────────────────────────────────

  describe('getTaskById', () => {
    it('returns task when found', async () => {
      const { repo, mockPrisma } = makeRepo();
      const task = { id: 5, prompt: 'Listen and answer', answerOptions: ['A', 'B'], correctAnswer: 'A' };
      mockPrisma.task.findUnique.mockResolvedValue(task);

      const result = await repo.getTaskById(5);

      expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(result).toEqual(task);
    });

    it('returns null when task not found', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.task.findUnique.mockResolvedValue(null);

      const result = await repo.getTaskById(999);
      expect(result).toBeNull();
    });
  });

  // ─── getNextListeningTask ──────────────────────────────────────────────────

  describe('getNextListeningTask', () => {
    const taskA = { id: 10, language: 'english', level: 'B1', skill: 'listening', prompt: 'A', answerOptions: [], createdAt: new Date() };
    const taskB = { id: 11, language: 'english', level: 'B1', skill: 'listening', prompt: 'B', answerOptions: [], createdAt: new Date() };

    it('returns first task not yet 100% completed by the user', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.task.findMany.mockResolvedValue([taskA, taskB]);
      // taskA completed at 100%, taskB not
      mockPrisma.$queryRaw.mockResolvedValue([{ task_id: 10 }]);

      const result = await repo.getNextListeningTask(42, 'english', 'B1');

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { language: 'english', level: 'B1', skill: 'listening' } }),
      );
      expect(result).toEqual(taskB);
    });

    it('returns first task when user has no scores at all', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.task.findMany.mockResolvedValue([taskA, taskB]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await repo.getNextListeningTask(42, 'english', 'B1');
      expect(result).toEqual(taskA);
    });

    it('returns null when no tasks match the filter', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.task.findMany.mockResolvedValue([]);

      const result = await repo.getNextListeningTask(42, 'english', 'B1');
      expect(result).toBeNull();
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('returns null when all tasks are 100% completed', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.task.findMany.mockResolvedValue([taskA, taskB]);
      mockPrisma.$queryRaw.mockResolvedValue([{ task_id: 10 }, { task_id: 11 }]);

      const result = await repo.getNextListeningTask(42, 'english', 'B1');
      expect(result).toBeNull();
    });

    it('treats all tasks as incomplete when $queryRaw throws (pre-migration)', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.task.findMany.mockResolvedValue([taskA]);
      mockPrisma.$queryRaw.mockRejectedValue(new Error('relation "listening_scores" does not exist'));

      const result = await repo.getNextListeningTask(42, 'english', 'B1');
      expect(result).toEqual(taskA);
    });
  });

  // ─── createTask ────────────────────────────────────────────────────────────

  describe('createTask', () => {
    it('persists all task fields and returns created task', async () => {
      const { repo, mockPrisma } = makeRepo();
      const input = {
        language: 'english',
        level: 'B1',
        skill: 'listening',
        prompt: 'Listen and answer',
        audioUrl: 'data:audio/mpeg;base64,AAAA',
        referenceText: 'The speaker talks about travel.',
        answerOptions: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'A',
      };
      const saved = { id: 10, ...input, createdAt: new Date() };
      mockPrisma.task.create.mockResolvedValue(saved);

      const result = await repo.createTask(input);

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          language: 'english',
          level: 'B1',
          skill: 'listening',
          prompt: 'Listen and answer',
          audioUrl: 'data:audio/mpeg;base64,AAAA',
          referenceText: 'The speaker talks about travel.',
          answerOptions: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'A',
        }),
      });
      expect(result).toEqual(saved);
    });

    it('stores null for optional fields when not provided', async () => {
      const { repo, mockPrisma } = makeRepo();
      const saved = { id: 11, language: 'german', level: 'A2', skill: 'listening', prompt: 'p', answerOptions: [], correctAnswer: null, audioUrl: null, referenceText: null, createdAt: new Date() };
      mockPrisma.task.create.mockResolvedValue(saved);

      await repo.createTask({ language: 'german', level: 'A2', skill: 'listening', prompt: 'p', answerOptions: [] });

      const call = mockPrisma.task.create.mock.calls[0][0];
      expect(call.data.audioUrl).toBeNull();
      expect(call.data.referenceText).toBeNull();
      expect(call.data.correctAnswer).toBeNull();
    });
  });

  // ─── upsertListeningScore ──────────────────────────────────────────────────

  describe('upsertListeningScore', () => {
    it('calls $executeRaw with upsert SQL', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await repo.upsertListeningScore(42, 10, 1.0);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('can be called multiple times for the same userId+taskId', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await repo.upsertListeningScore(42, 10, 0.5);
      await repo.upsertListeningScore(42, 10, 1.0);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
    });
  });

  // ─── getListeningScore ─────────────────────────────────────────────────────

  describe('getListeningScore', () => {
    it('returns score when found', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.$queryRaw.mockResolvedValue([{ score: 0.75 }]);

      const result = await repo.getListeningScore(42, 10);

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ score: 0.75 });
    });

    it('returns null when no score record found', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await repo.getListeningScore(42, 999);
      expect(result).toBeNull();
    });
  });

  // ─── updateTaskAudio ───────────────────────────────────────────────────────

  describe('updateTaskAudio', () => {
    it('calls task.update with the new audioUrl', async () => {
      const { repo, mockPrisma } = makeRepo();
      mockPrisma.task.update.mockResolvedValue(undefined);

      await repo.updateTaskAudio(10, 'data:audio/mpeg;base64,NEWDATA');

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { audioUrl: 'data:audio/mpeg;base64,NEWDATA' },
      });
    });
  });
});
