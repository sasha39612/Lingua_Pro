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
        { text: 'Hello', language: 'English' },
      );
      expect(mockPrisma.text.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 5, language: 'English' }) }),
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
        language: 'English',
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
  });

  // ─── getTextsByLanguage ──────────────────────────────────────────────────

  describe('getTextsByLanguage', () => {
    it('returns texts from DB for given language', async () => {
      const { service, mockPrisma } = makeService();

      const rows = [{ textScore: 0.8, feedback: 'ok', createdAt: new Date() }];
      mockPrisma.text.findMany.mockResolvedValue(rows);

      const result = await service.getTextsByLanguage('English');

      expect(mockPrisma.text.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { language: 'English' } }),
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

    it('returns empty texts when DB fails', async () => {
      const { service, mockPrisma } = makeService();
      mockPrisma.text.findMany.mockRejectedValue(new Error('DB error'));

      const result = await service.getTextsByLanguage('Polish');
      expect(result).toEqual({ texts: [] });
    });
  });

  // ─── getTasks ────────────────────────────────────────────────────────────

  describe('getTasks', () => {
    it('returns cached tasks from DB without calling orchestrator', async () => {
      const { service, mockPrisma, mockHttp } = makeService();

      const cachedTasks = [{ id: 1, language: 'English', level: 'A1', skill: 'reading', prompt: 'Task' }];
      mockPrisma.task.findMany.mockResolvedValue(cachedTasks);

      const result = await service.getTasks('English', 'A1', 'reading');

      expect(result).toEqual(cachedTasks);
      expect(mockHttp.post).not.toHaveBeenCalled();
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
        { language: 'English', level: 'A1', skill: 'reading' },
      );
      expect(mockPrisma.task.create).toHaveBeenCalledTimes(generatedTasks.length);
      expect(result).toEqual(generatedTasks);
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
