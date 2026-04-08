import { vi } from 'vitest';
import { TextController } from './text.controller';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeController() {
  const mockService = {
    analyzeText: vi.fn(),
    getTasks: vi.fn(),
    getTextsByLanguage: vi.fn(),
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

      expect(mockService.analyzeText).toHaveBeenCalledWith(5, 'English', 'Hello world');
      expect(result).toEqual(expected);
    });

    it('passes NaN userId when userId string is non-numeric', async () => {
      const { controller, mockService } = makeController();
      mockService.analyzeText.mockResolvedValue({});

      await controller.check('abc', 'English', 'text');

      // parseInt('abc') === NaN — service receives NaN; validation is service's responsibility
      expect(mockService.analyzeText).toHaveBeenCalledWith(NaN, 'English', 'text');
    });

    it('propagates service errors', async () => {
      const { controller, mockService } = makeController();
      mockService.analyzeText.mockRejectedValue(new Error('DB error'));

      await expect(controller.check('1', 'English', 'text')).rejects.toThrow('DB error');
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

      expect(mockService.getTextsByLanguage).toHaveBeenCalledWith('Polish', undefined);
      expect(result).toEqual(data);
    });

    it('passes optional from parameter', async () => {
      const { controller, mockService } = makeController();
      mockService.getTextsByLanguage.mockResolvedValue({ texts: [] });

      await controller.byLanguage('English', '2026-01-01');

      expect(mockService.getTextsByLanguage).toHaveBeenCalledWith('English', '2026-01-01');
    });

    it('propagates service errors', async () => {
      const { controller, mockService } = makeController();
      mockService.getTextsByLanguage.mockRejectedValue(new Error('DB connection lost'));

      await expect(controller.byLanguage('German')).rejects.toThrow('DB connection lost');
    });
  });
});
