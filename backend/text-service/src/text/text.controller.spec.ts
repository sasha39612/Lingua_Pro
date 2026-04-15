import { vi } from 'vitest';
import { TextController } from './text.controller';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeController() {
  const mockService = {
    analyzeText: vi.fn(),
    getTasks: vi.fn(),
    getTextsByLanguage: vi.fn(),
    recordScore: vi.fn(),
  };
  const controller = new TextController(mockService as any);
  return { controller, mockService };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TextController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── POST /text/check ──────────────────────────────────────────────────────

  describe('check', () => {
    it('calls analyzeText with parsed userId and returns result', async () => {
      const { controller, mockService } = makeController();
      const expected = { id: 1, originalText: 'Hello' };
      mockService.analyzeText.mockResolvedValue(expected);

      const result = await controller.check('5', 'English', 'Hello world');

      expect(mockService.analyzeText).toHaveBeenCalledWith(5, 'English', 'Hello world', undefined);
      expect(result).toEqual(expected);
    });

    it('passes skill when provided', async () => {
      const { controller, mockService } = makeController();
      mockService.analyzeText.mockResolvedValue({});

      await controller.check('5', 'English', 'Hello', 'writing');

      expect(mockService.analyzeText).toHaveBeenCalledWith(5, 'English', 'Hello', 'writing');
    });

    it('passes NaN userId when userId string is non-numeric', async () => {
      const { controller, mockService } = makeController();
      mockService.analyzeText.mockResolvedValue({});

      await controller.check('abc', 'English', 'text');

      expect(mockService.analyzeText).toHaveBeenCalledWith(NaN, 'English', 'text', undefined);
    });

    it('propagates service errors', async () => {
      const { controller, mockService } = makeController();
      mockService.analyzeText.mockRejectedValue(new Error('DB error'));

      await expect(controller.check('1', 'English', 'text')).rejects.toThrow('DB error');
    });
  });

  // ─── POST /text/score ──────────────────────────────────────────────────────

  describe('score', () => {
    it('calls recordScore with parsed userId and returns result', async () => {
      const { controller, mockService } = makeController();
      const expected = { id: 10, skill: 'reading', score: 0.85, createdAt: new Date().toISOString() };
      mockService.recordScore.mockResolvedValue(expected);

      const result = await controller.score('7', 'English', 'reading', 0.85);

      expect(mockService.recordScore).toHaveBeenCalledWith(7, 'English', 'reading', 0.85);
      expect(result).toEqual(expected);
    });

    it('works for writing skill', async () => {
      const { controller, mockService } = makeController();
      mockService.recordScore.mockResolvedValue({ id: 11, skill: 'writing', score: 0.7 });

      await controller.score('3', 'German', 'writing', 0.7);

      expect(mockService.recordScore).toHaveBeenCalledWith(3, 'German', 'writing', 0.7);
    });

    it('propagates service errors', async () => {
      const { controller, mockService } = makeController();
      mockService.recordScore.mockRejectedValue(new Error('DB connection lost'));

      await expect(controller.score('1', 'English', 'reading', 0.5)).rejects.toThrow('DB connection lost');
    });
  });

  // ─── GET /text/tasks ───────────────────────────────────────────────────────

  describe('tasks', () => {
    it('returns tasks from service with language and level', async () => {
      const { controller, mockService } = makeController();
      const tasks = [{ id: 1, prompt: 'Write an essay' }];
      mockService.getTasks.mockResolvedValue(tasks);

      const result = await controller.tasks('English', 'B1');

      expect(mockService.getTasks).toHaveBeenCalledWith('English', 'B1', undefined, null);
      expect(result).toEqual(tasks);
    });

    it('passes optional skill parameter', async () => {
      const { controller, mockService } = makeController();
      mockService.getTasks.mockResolvedValue([]);

      await controller.tasks('German', 'A2', 'writing');

      expect(mockService.getTasks).toHaveBeenCalledWith('German', 'A2', 'writing', null);
    });

    it('propagates service errors', async () => {
      const { controller, mockService } = makeController();
      mockService.getTasks.mockRejectedValue(new Error('Orchestrator down'));

      await expect(controller.tasks('English', 'A1')).rejects.toThrow('Orchestrator down');
    });
  });

  // ─── GET /text/by-language ─────────────────────────────────────────────────

  describe('byLanguage', () => {
    it('returns texts for the given language', async () => {
      const { controller, mockService } = makeController();
      const data = { texts: [{ textScore: 0.8, createdAt: new Date() }] };
      mockService.getTextsByLanguage.mockResolvedValue(data);

      const result = await controller.byLanguage('Polish');

      expect(mockService.getTextsByLanguage).toHaveBeenCalledWith('Polish', undefined, undefined, undefined);
      expect(result).toEqual(data);
    });

    it('passes optional from parameter', async () => {
      const { controller, mockService } = makeController();
      mockService.getTextsByLanguage.mockResolvedValue({ texts: [] });

      await controller.byLanguage('English', '2026-01-01');

      expect(mockService.getTextsByLanguage).toHaveBeenCalledWith('English', '2026-01-01', undefined, undefined);
    });

    it('passes optional skill parameter', async () => {
      const { controller, mockService } = makeController();
      mockService.getTextsByLanguage.mockResolvedValue({ texts: [] });

      await controller.byLanguage('English', undefined, 'reading');

      expect(mockService.getTextsByLanguage).toHaveBeenCalledWith('English', undefined, 'reading', undefined);
    });

    it('passes both from and skill when provided', async () => {
      const { controller, mockService } = makeController();
      mockService.getTextsByLanguage.mockResolvedValue({ texts: [] });

      await controller.byLanguage('German', '2026-01-01', 'writing');

      expect(mockService.getTextsByLanguage).toHaveBeenCalledWith('German', '2026-01-01', 'writing', undefined);
    });

    it('propagates service errors', async () => {
      const { controller, mockService } = makeController();
      mockService.getTextsByLanguage.mockRejectedValue(new Error('DB connection lost'));

      await expect(controller.byLanguage('German')).rejects.toThrow('DB connection lost');
    });
  });
});
