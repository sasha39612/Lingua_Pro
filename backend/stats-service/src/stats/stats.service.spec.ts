import { StatsService } from './stats.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTextRow(textScore: number | null, feedback: string | null, date: string) {
  return { textScore, feedback, createdAt: `${date}T10:00:00.000Z` };
}

function makeAudioRow(pronunciationScore: number | null, feedback: string | null, date: string) {
  return { pronunciationScore, feedback, createdAt: `${date}T10:00:00.000Z` };
}

// ─── Mock global fetch ────────────────────────────────────────────────────────

import { vi } from 'vitest';

const globalFetch = vi.fn();
(global as any).fetch = globalFetch;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StatsService', () => {
  let service: StatsService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TEXT_SERVICE_URL = 'http://text-service:4002';
    process.env.AUDIO_SERVICE_URL = 'http://audio-service:4003';
    service = new StatsService();
  });

  // ─── getStats: averages ────────────────────────────────────────────────────

  describe('getStats – score averages', () => {
    it('computes avg_text_score and avg_pronunciation_score from fetched data', async () => {
      globalFetch
        .mockResolvedValueOnce({
          json: async () => ({
            texts: [
              makeTextRow(0.8, null, '2026-01-01'),
              makeTextRow(0.6, null, '2026-01-02'),
            ],
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            records: [
              makeAudioRow(0.9, 'Excellent pronunciation', '2026-01-01'),
              makeAudioRow(0.7, 'Good pronunciation', '2026-01-02'),
            ],
          }),
        });

      const stats = await service.getStats('English', 'all');

      expect(stats.avg_text_score).toBeCloseTo(0.7);
      expect(stats.avg_pronunciation_score).toBeCloseTo(0.8);
    });

    it('returns zeros when no data is available', async () => {
      globalFetch
        .mockResolvedValueOnce({ json: async () => ({ texts: [] }) })
        .mockResolvedValueOnce({ json: async () => ({ records: [] }) });

      const stats = await service.getStats('English', 'week');
      expect(stats.avg_text_score).toBe(0);
      expect(stats.avg_pronunciation_score).toBe(0);
      expect(stats.mistakes_total).toBe(0);
      expect(stats.history).toEqual([]);
    });

    it('ignores null scores in average calculation', async () => {
      globalFetch
        .mockResolvedValueOnce({
          json: async () => ({
            texts: [
              makeTextRow(0.9, null, '2026-01-01'),
              makeTextRow(null, null, '2026-01-02'), // null → excluded
            ],
          }),
        })
        .mockResolvedValueOnce({ json: async () => ({ records: [] }) });

      const stats = await service.getStats('German', 'all');
      expect(stats.avg_text_score).toBeCloseTo(0.9);
    });
  });

  // ─── getStats: language normalisation ────────────────────────────────────

  describe('getStats – language normalisation', () => {
    it('normalises "EN" → "english" in the fetch URL', async () => {
      globalFetch
        .mockResolvedValueOnce({ json: async () => ({ texts: [] }) })
        .mockResolvedValueOnce({ json: async () => ({ records: [] }) });

      await service.getStats('EN', 'all');

      const [textUrl] = globalFetch.mock.calls[0];
      expect(textUrl).toContain('language=english');
    });

    it('preserves the original cased language in the response', async () => {
      globalFetch
        .mockResolvedValueOnce({ json: async () => ({ texts: [] }) })
        .mockResolvedValueOnce({ json: async () => ({ records: [] }) });

      const stats = await service.getStats('polish', 'all');
      expect(stats.language).toBe('POLISH');
    });
  });

  // ─── getStats: mistake counts ─────────────────────────────────────────────

  describe('getStats – mistake_counts_by_type', () => {
    it('detects grammar mistakes from feedback segments', async () => {
      globalFetch
        .mockResolvedValueOnce({
          json: async () => ({
            texts: [makeTextRow(0.5, 'Grammar: incorrect tense; Spelling: studing', '2026-01-01')],
          }),
        })
        .mockResolvedValueOnce({ json: async () => ({ records: [] }) });

      const stats = await service.getStats('English', 'all');
      expect(stats.mistake_counts_by_type['grammar']).toBe(1);
      expect(stats.mistake_counts_by_type['spelling']).toBe(1);
      expect(stats.mistakes_total).toBe(2);
    });

    it('skips "no errors" feedback', async () => {
      globalFetch
        .mockResolvedValueOnce({
          json: async () => ({
            texts: [makeTextRow(1.0, 'Great work! No obvious errors detected.', '2026-01-01')],
          }),
        })
        .mockResolvedValueOnce({ json: async () => ({ records: [] }) });

      const stats = await service.getStats('English', 'all');
      expect(stats.mistakes_total).toBe(0);
    });

    it('counts pronunciation_major when score < 0.7', async () => {
      globalFetch
        .mockResolvedValueOnce({ json: async () => ({ texts: [] }) })
        .mockResolvedValueOnce({
          json: async () => ({
            records: [makeAudioRow(0.5, 'pronunciation needs work', '2026-01-01')],
          }),
        });

      const stats = await service.getStats('English', 'all');
      expect(stats.mistake_counts_by_type['pronunciation_major']).toBeGreaterThanOrEqual(1);
    });

    it('counts pronunciation_minor when score between 0.7 and 0.85', async () => {
      globalFetch
        .mockResolvedValueOnce({ json: async () => ({ texts: [] }) })
        .mockResolvedValueOnce({
          json: async () => ({
            records: [makeAudioRow(0.75, 'Good pronunciation could be better', '2026-01-01')],
          }),
        });

      const stats = await service.getStats('English', 'all');
      expect(stats.mistake_counts_by_type['pronunciation_minor']).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── getStats: daily history ──────────────────────────────────────────────

  describe('getStats – history (daily rollup)', () => {
    it('groups scores by date and computes daily averages', async () => {
      globalFetch
        .mockResolvedValueOnce({
          json: async () => ({
            texts: [
              makeTextRow(0.8, null, '2026-01-01'),
              makeTextRow(0.6, null, '2026-01-01'),
              makeTextRow(0.9, null, '2026-01-02'),
            ],
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            records: [makeAudioRow(0.85, null, '2026-01-01')],
          }),
        });

      const stats = await service.getStats('English', 'all');
      const jan1 = stats.history.find((h: any) => h.date === '2026-01-01');
      const jan2 = stats.history.find((h: any) => h.date === '2026-01-02');

      expect(jan1).toBeDefined();
      expect(jan1!.text_score).toBeCloseTo(0.7); // (0.8 + 0.6) / 2
      expect(jan1!.pronunciation_score).toBeCloseTo(0.85);
      expect(jan2).toBeDefined();
      expect(jan2!.text_score).toBeCloseTo(0.9);
      expect(jan2!.pronunciation_score).toBe(0); // no audio for jan2
    });

    it('returns history sorted chronologically', async () => {
      globalFetch
        .mockResolvedValueOnce({
          json: async () => ({
            texts: [
              makeTextRow(0.5, null, '2026-01-03'),
              makeTextRow(0.5, null, '2026-01-01'),
            ],
          }),
        })
        .mockResolvedValueOnce({ json: async () => ({ records: [] }) });

      const stats = await service.getStats('English', 'all');
      const dates = stats.history.map((h: any) => h.date);
      expect(dates).toEqual([...dates].sort());
    });
  });

  // ─── getStats: charts ─────────────────────────────────────────────────────

  describe('getStats – charts', () => {
    it('builds mistakesByType chart sorted by count descending', async () => {
      globalFetch
        .mockResolvedValueOnce({
          json: async () => ({
            texts: [
              makeTextRow(0.5, 'grammar: bad tense; grammar: wrong verb; spelling: typo', '2026-01-01'),
            ],
          }),
        })
        .mockResolvedValueOnce({ json: async () => ({ records: [] }) });

      const stats = await service.getStats('English', 'all');
      const { labels, values } = stats.charts.mistakesByType;
      // grammar should appear before spelling (2 > 1)
      expect(labels[0]).toBe('grammar');
      expect(values[0]).toBe(2);
      expect(labels[1]).toBe('spelling');
      expect(values[1]).toBe(1);
    });

    it('builds progressOverTime chart with labels and score arrays', async () => {
      globalFetch
        .mockResolvedValueOnce({
          json: async () => ({
            texts: [makeTextRow(0.8, null, '2026-01-01')],
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            records: [makeAudioRow(0.9, null, '2026-01-01')],
          }),
        });

      const stats = await service.getStats('English', 'all');
      const { labels, textScores, pronunciationScores } = stats.charts.progressOverTime;
      expect(labels).toContain('2026-01-01');
      expect(textScores.length).toBe(labels.length);
      expect(pronunciationScores.length).toBe(labels.length);
    });
  });

  // ─── getStats: resilience ─────────────────────────────────────────────────

  describe('getStats – resilience', () => {
    it('returns empty stats if text-service is unreachable', async () => {
      globalFetch
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce({ json: async () => ({ records: [] }) });

      const stats = await service.getStats('English', 'week');
      expect(stats.avg_text_score).toBe(0);
      expect(stats.avg_pronunciation_score).toBe(0);
    });

    it('returns empty stats if both services are unreachable', async () => {
      globalFetch
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const stats = await service.getStats('English', 'month');
      expect(stats.avg_text_score).toBe(0);
      expect(stats.avg_pronunciation_score).toBe(0);
      expect(stats.mistakes_total).toBe(0);
    });

    it('includes from param in fetch URLs for week period', async () => {
      globalFetch
        .mockResolvedValueOnce({ json: async () => ({ texts: [] }) })
        .mockResolvedValueOnce({ json: async () => ({ records: [] }) });

      await service.getStats('English', 'week');

      const [textUrl] = globalFetch.mock.calls[0];
      expect(textUrl).toMatch(/from=.+/);
    });

    it('does not include from param for "all" period', async () => {
      globalFetch
        .mockResolvedValueOnce({ json: async () => ({ texts: [] }) })
        .mockResolvedValueOnce({ json: async () => ({ records: [] }) });

      await service.getStats('English', 'all');

      const [textUrl] = globalFetch.mock.calls[0];
      expect(textUrl).not.toMatch(/from=/);
    });
  });
});
