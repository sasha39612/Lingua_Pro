import { vi } from 'vitest';
import { StatsController } from './stats.controller';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeController() {
  const mockService = {
    getStats: vi.fn(),
  };
  const controller = new StatsController(mockService as any);
  return { controller, mockService };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StatsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStats', () => {
    it('calls service with uppercased language and returns result', async () => {
      const { controller, mockService } = makeController();
      const statsResult = {
        language: 'ENGLISH',
        avg_text_score: 0.8,
        avg_pronunciation_score: 0.75,
        mistakes_total: 3,
        history: [],
        charts: {},
      };
      mockService.getStats.mockResolvedValue(statsResult);

      const result = await controller.getStats({ language: 'english', period: 'week' });

      expect(mockService.getStats).toHaveBeenCalledWith('ENGLISH', 'week', undefined);
      expect(result).toEqual(statsResult);
    });

    it('uppercases the language before passing to service', async () => {
      const { controller, mockService } = makeController();
      mockService.getStats.mockResolvedValue({});

      await controller.getStats({ language: 'german', period: 'month' });

      expect(mockService.getStats).toHaveBeenCalledWith('GERMAN', 'month', undefined);
    });

    it('passes "all" period correctly', async () => {
      const { controller, mockService } = makeController();
      mockService.getStats.mockResolvedValue({});

      await controller.getStats({ language: 'Polish', period: 'all' });

      expect(mockService.getStats).toHaveBeenCalledWith('POLISH', 'all', undefined);
    });

    it('propagates service errors', async () => {
      const { controller, mockService } = makeController();
      mockService.getStats.mockRejectedValue(new Error('fetch failed'));

      await expect(controller.getStats({ language: 'English', period: 'week' })).rejects.toThrow('fetch failed');
    });
  });
});
