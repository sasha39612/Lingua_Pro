import { vi } from 'vitest';
import { of, throwError } from 'rxjs';

// ─── Mock heavy modules before any import ────────────────────────────────────

vi.mock('../graphql/text.schema', () => ({
  simulateAIAnalysis: vi.fn(() => ({ corrected: 'corrected text', feedback: 'Minor corrections.' })),
  calculateTextScore: vi.fn(() => 0.75),
  textTypeDefs: {},
  textSchema: {},
  buildTextSchema: vi.fn(),
}));

vi.mock('../prisma/prisma.service', () => ({
  PrismaService: vi.fn(),
}));

import { TextService } from './text.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeService() {
  const mockPrisma = {
    text: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };

  const mockHttp = {
    post: vi.fn(),
  };

  const service = new TextService(mockPrisma as any, mockHttp as any);
  return { service, mockPrisma, mockHttp };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TextService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── analyzeText ────────────────────────────────────────────────────────

  describe('analyzeText', () => {
    it('calls orchestrator, saves result to DB, and returns record', async () => {
      const { service, mockPrisma, mockHttp } = makeService();

      const orchestratorResponse = { correctedText: 'Corrected.', feedback: 'OK', textScore: 0.9 };
      mockHttp.post.mockReturnValue(of({ data: orchestratorResponse }));

      const savedRecord = { id: 1, userId: 5, language: 'English', originalText: 'Hello', createdAt: new Date() };
      mockPrisma.text.create.mockResolvedValue(savedRecord);

      const result = await service.analyzeText(5, 'English', 'Hello');

      expect(mockHttp.post).toHaveBeenCalledWith(
        expect.stringContaining('/text/analyze'),
        { text: 'Hello', language: 'english' },
      );
      expect(mockPrisma.text.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 5, language: 'english' }) }),
      );
      expect(result).toEqual(savedRecord);
    });

    it('falls back to local analysis when orchestrator is unavailable', async () => {
      const { service, mockPrisma, mockHttp } = makeService();

      mockHttp.post.mockReturnValue(throwError(() => new Error('ECONNREFUSED')));
      const savedRecord = { id: 2, userId: 5, language: 'English', originalText: 'Hi' };
      mockPrisma.text.create.mockResolvedValue(savedRecord);

      const result = await service.analyzeText(5, 'English', 'Hi');

      expect(mockPrisma.text.create).toHaveBeenCalled();
      expect(result).toEqual(savedRecord);
    });

    it('returns unpersisted result when DB write fails', async () => {
      const { service, mockPrisma, mockHttp } = makeService();

      mockHttp.post.mockReturnValue(of({ data: { correctedText: 'ok', feedback: 'ok', textScore: 0.8 } }));
      mockPrisma.text.create.mockRejectedValue(new Error('DB connection lost'));

      const result = await service.analyzeText(5, 'English', 'Hello');

      expect(result).toMatchObject({
        id: -1,
        userId: 5,
        language: 'english',
        originalText: 'Hello',
        persisted: false,
      });
    });

    it('uses calculateTextScore when orchestrator omits textScore', async () => {
      const { service, mockPrisma, mockHttp } = makeService();

      mockHttp.post.mockReturnValue(of({ data: { correctedText: 'ok', feedback: 'ok' } }));
      const savedRecord = { id: 3 };
      mockPrisma.text.create.mockResolvedValue(savedRecord);

      await service.analyzeText(5, 'English', 'Hello');

      expect(mockPrisma.text.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ textScore: 0.75 }) }),
      );
    });

    it('saves skill field to DB when provided', async () => {
      const { service, mockPrisma, mockHttp } = makeService();
      mockHttp.post.mockReturnValue(of({ data: { correctedText: 'ok', feedback: 'ok', textScore: 0.8 } }));
      mockPrisma.text.create.mockResolvedValue({ id: 4 });

      await service.analyzeText(5, 'English', 'Hello', 'writing');

      expect(mockPrisma.text.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ skill: 'writing' }) }),
      );
    });

    it('defaults skill to "writing" when not provided', async () => {
      const { service, mockPrisma, mockHttp } = makeService();
      mockHttp.post.mockReturnValue(of({ data: { correctedText: 'ok', feedback: 'ok', textScore: 0.8 } }));
      mockPrisma.text.create.mockResolvedValue({ id: 5 });

      await service.analyzeText(5, 'English', 'Hello');

      expect(mockPrisma.text.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ skill: 'writing' }) }),
      );
    });
  });

  // ─── getTextsByLanguage ──────────────────────────────────────────────────

  describe('getTextsByLanguage', () => {
    it('returns texts from DB for given language', async () => {
      const { service, mockPrisma } = makeService();

      const rows = [{ textScore: 0.8, feedback: 'ok', createdAt: new Date() }];
      mockPrisma.text.findMany.mockResolvedValue(rows);

      const result = await service.getTextsByLanguage('English');

      expect(mockPrisma.text.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { language: 'english' } }),
      );
      expect(result).toEqual({ texts: rows });
    });

    it('applies date filter when "from" is provided', async () => {
      const { service, mockPrisma } = makeService();
      mockPrisma.text.findMany.mockResolvedValue([]);

      await service.getTextsByLanguage('German', '2026-01-01');

      expect(mockPrisma.text.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ createdAt: expect.any(Object) }),
        }),
      );
    });

    it('applies skill filter when provided', async () => {
      const { service, mockPrisma } = makeService();
      mockPrisma.text.findMany.mockResolvedValue([]);

      await service.getTextsByLanguage('English', undefined, 'reading');

      expect(mockPrisma.text.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ skill: 'reading' }) }),
      );
    });

    it('does not add skill filter when skill is undefined', async () => {
      const { service, mockPrisma } = makeService();
      mockPrisma.text.findMany.mockResolvedValue([]);

      await service.getTextsByLanguage('English');

      const call = mockPrisma.text.findMany.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('skill');
    });

    it('returns empty texts when DB fails', async () => {
      const { service, mockPrisma } = makeService();
      mockPrisma.text.findMany.mockRejectedValue(new Error('DB error'));

      const result = await service.getTextsByLanguage('Polish');
      expect(result).toEqual({ texts: [] });
    });
  });

  // ─── recordScore ─────────────────────────────────────────────────────────

  describe('recordScore', () => {
    it('creates a text record with the given score and skill', async () => {
      const { service, mockPrisma } = makeService();
      const saved = { id: 99, skill: 'reading', textScore: 0.85, createdAt: new Date() };
      mockPrisma.text.create.mockResolvedValue(saved);

      const result = await service.recordScore(7, 'English', 'reading', 0.85);

      expect(mockPrisma.text.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 7,
            language: 'english',
            skill: 'reading',
            textScore: 0.85,
          }),
        }),
      );
      expect(result).toMatchObject({ id: 99, skill: 'reading', score: 0.85 });
    });

    it('works for writing skill', async () => {
      const { service, mockPrisma } = makeService();
      mockPrisma.text.create.mockResolvedValue({ id: 100, createdAt: new Date() });

      const result = await service.recordScore(3, 'German', 'writing', 0.72);

      expect(mockPrisma.text.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ skill: 'writing', textScore: 0.72 }) }),
      );
      expect(result.skill).toBe('writing');
    });

    it('returns fallback object with id=-1 when DB write fails', async () => {
      const { service, mockPrisma } = makeService();
      mockPrisma.text.create.mockRejectedValue(new Error('DB error'));

      const result = await service.recordScore(5, 'English', 'reading', 0.6);

      expect(result).toMatchObject({ id: -1, skill: 'reading', score: 0.6 });
    });
  });

  // ─── getTasks ────────────────────────────────────────────────────────────

  describe('getTasks', () => {
    it('returns cached tasks from DB without calling orchestrator', async () => {
      const { service, mockPrisma, mockHttp } = makeService();

      // Reading tasks must have questions stored; include them so the filter passes
      const cachedTasks = [{ id: 1, language: 'English', level: 'A1', skill: 'reading', prompt: 'Task', questions: [{ type: 'multiple_choice', question: 'Q?' }] }];
      mockPrisma.task.findMany.mockResolvedValue(cachedTasks);

      const result = await service.getTasks('English', 'A1', 'reading');

      expect(result).toEqual(cachedTasks);
      expect(mockHttp.post).not.toHaveBeenCalled();
    });

    it('regenerates reading tasks when cached tasks have no questions', async () => {
      const { service, mockPrisma, mockHttp } = makeService();

      // Stale tasks without questions (e.g. cached before questions column was added)
      const staleTasks = [{ id: 1, language: 'English', level: 'A1', skill: 'reading', prompt: 'Task', questions: null }];
      const generatedTasks = [{ language: 'English', level: 'A1', skill: 'reading', prompt: 'New', questions: [{ type: 'multiple_choice' }] }];
      mockPrisma.task.findMany.mockResolvedValue(staleTasks);
      mockPrisma.task.create.mockResolvedValue({ id: 2, ...generatedTasks[0] });
      mockHttp.post.mockReturnValue(of({ data: { tasks: generatedTasks } }));

      const result = await service.getTasks('English', 'A1', 'reading');

      expect(mockHttp.post).toHaveBeenCalled();
      expect(result.length).toBeGreaterThan(0);
    });

    it('calls orchestrator and persists when DB has no cached tasks', async () => {
      const { service, mockPrisma, mockHttp } = makeService();

      mockPrisma.task.findMany.mockResolvedValue([]);
      const generatedTasks = [
        { language: 'English', level: 'A1', skill: 'reading', prompt: 'Generated task' },
      ];
      mockHttp.post.mockReturnValue(of({ data: { tasks: generatedTasks } }));
      mockPrisma.task.create.mockResolvedValue({});

      const result = await service.getTasks('English', 'A1', 'reading');

      expect(mockHttp.post).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/generate'),
        { language: 'english', level: 'A1', skill: 'reading' },
      );
      expect(mockPrisma.task.create).toHaveBeenCalledTimes(generatedTasks.length);
      expect(result).toEqual([{}]); // service returns persisted DB records, not raw orchestrator data
    });

    it('returns empty array when DB is empty and orchestrator fails', async () => {
      const { service, mockPrisma, mockHttp } = makeService();

      mockPrisma.task.findMany.mockResolvedValue([]);
      mockHttp.post.mockReturnValue(throwError(() => new Error('Orchestrator down')));

      const result = await service.getTasks('English', 'A1');
      expect(result).toEqual([]);
    });

    it('filters by skill when provided', async () => {
      const { service, mockPrisma } = makeService();
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.findMany.mockResolvedValueOnce([{ id: 1 }]);

      await service.getTasks('English', 'B1', 'writing');

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ skill: 'writing' }) }),
      );
    });
  });
});
