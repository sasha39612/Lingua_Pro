import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Period = 'week' | 'month' | 'all';

type AggregateRow = {
  avg_text_score: number | null;
  avg_pronunciation_score: number | null;
};

type HistoryRow = {
  date: Date | string;
  text_score: number | null;
  pronunciation_score: number | null;
};

type TextFeedbackRow = {
  feedback: string | null;
};

type AudioFeedbackRow = {
  feedback: string | null;
  pronunciation_score: number | null;
};

type MistakeCounts = Record<string, number>;

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(language: string, period: Period) {
    const requestedLanguage = language.trim().toUpperCase();
    const normalizedLanguage = this.normalizeLanguage(requestedLanguage);
    const fromDate = this.getFromDate(period);

    const aggregate = await this.prisma.$queryRaw<AggregateRow[]>`
      SELECT
        (
          SELECT AVG(t.text_score)::float
          FROM texts t
          JOIN users u ON u.id = t.user_id
          WHERE LOWER(u.language) = ${normalizedLanguage}
            AND (CAST(${fromDate} AS timestamp) IS NULL OR t.created_at >= CAST(${fromDate} AS timestamp))
        ) AS avg_text_score,
        (
          SELECT AVG(a.pronunciation_score)::float
          FROM audio_records a
          JOIN users u ON u.id = a.user_id
          WHERE LOWER(u.language) = ${normalizedLanguage}
            AND (CAST(${fromDate} AS timestamp) IS NULL OR a.created_at >= CAST(${fromDate} AS timestamp))
        ) AS avg_pronunciation_score
    `;

    const history = await this.prisma.$queryRaw<HistoryRow[]>`
      WITH text_daily AS (
        SELECT
          DATE(t.created_at) AS date,
          AVG(t.text_score)::float AS text_score
        FROM texts t
        JOIN users u ON u.id = t.user_id
        WHERE LOWER(u.language) = ${normalizedLanguage}
          AND (CAST(${fromDate} AS timestamp) IS NULL OR t.created_at >= CAST(${fromDate} AS timestamp))
        GROUP BY DATE(t.created_at)
      ),
      audio_daily AS (
        SELECT
          DATE(a.created_at) AS date,
          AVG(a.pronunciation_score)::float AS pronunciation_score
        FROM audio_records a
        JOIN users u ON u.id = a.user_id
        WHERE LOWER(u.language) = ${normalizedLanguage}
          AND (CAST(${fromDate} AS timestamp) IS NULL OR a.created_at >= CAST(${fromDate} AS timestamp))
        GROUP BY DATE(a.created_at)
      )
      SELECT
        COALESCE(td.date, ad.date) AS date,
        td.text_score,
        ad.pronunciation_score
      FROM text_daily td
      FULL OUTER JOIN audio_daily ad ON td.date = ad.date
      ORDER BY COALESCE(td.date, ad.date) ASC
    `;

    const textFeedbackRows = await this.prisma.$queryRaw<TextFeedbackRow[]>`
      SELECT t.feedback
      FROM texts t
      JOIN users u ON u.id = t.user_id
      WHERE LOWER(u.language) = ${normalizedLanguage}
        AND (CAST(${fromDate} AS timestamp) IS NULL OR t.created_at >= CAST(${fromDate} AS timestamp))
    `;

    const audioFeedbackRows = await this.prisma.$queryRaw<AudioFeedbackRow[]>`
      SELECT a.feedback, a.pronunciation_score
      FROM audio_records a
      JOIN users u ON u.id = a.user_id
      WHERE LOWER(u.language) = ${normalizedLanguage}
        AND (CAST(${fromDate} AS timestamp) IS NULL OR a.created_at >= CAST(${fromDate} AS timestamp))
    `;

    const row = aggregate[0] ?? {
      avg_text_score: null,
      avg_pronunciation_score: null,
    };

    const mistakeCountsByType = this.buildMistakeCountsByType(textFeedbackRows, audioFeedbackRows);
    const mistakesTotal = Object.values(mistakeCountsByType).reduce((sum, v) => sum + v, 0);

    const progressOverTime = history.map((h: HistoryRow) => ({
      date: this.toIsoDate(h.date),
      text_score: h.text_score ?? 0,
      pronunciation_score: h.pronunciation_score ?? 0,
    }));

    const charts = this.buildFrontendCharts(mistakeCountsByType, progressOverTime);

    return {
      language: requestedLanguage,
      period,
      avg_text_score: row.avg_text_score ?? 0,
      avg_pronunciation_score: row.avg_pronunciation_score ?? 0,
      mistakes_total: mistakesTotal,
      mistake_counts_by_type: mistakeCountsByType,
      history: progressOverTime,
      charts,
    };
  }

  private normalizeLanguage(input: string): string {
    const value = input.trim().toLowerCase();

    const aliases: Record<string, string> = {
      en: 'english',
      english: 'english',
      es: 'spanish',
      spanish: 'spanish',
      de: 'german',
      german: 'german',
      fr: 'french',
      french: 'french',
      it: 'italian',
      italian: 'italian',
      uk: 'ukrainian',
      ua: 'ukrainian',
      ukrainian: 'ukrainian',
      pl: 'polish',
      polish: 'polish',
    };

    return aliases[value] ?? value;
  }

  private buildMistakeCountsByType(
    textFeedbackRows: TextFeedbackRow[],
    audioFeedbackRows: AudioFeedbackRow[],
  ): MistakeCounts {
    const counts: MistakeCounts = {};

    for (const row of textFeedbackRows) {
      const feedback = row.feedback?.trim();
      if (!feedback || feedback === 'Great work! No obvious errors detected.') continue;

      const parts = feedback.split(';').map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        const mistakeType = this.detectMistakeType(part);
        counts[mistakeType] = (counts[mistakeType] ?? 0) + 1;
      }
    }

    for (const row of audioFeedbackRows) {
      const fromFeedback = this.detectAudioMistakeType(row.feedback);
      if (fromFeedback) counts[fromFeedback] = (counts[fromFeedback] ?? 0) + 1;

      if (typeof row.pronunciation_score === 'number' && row.pronunciation_score < 0.85) {
        const scoreType = row.pronunciation_score < 0.7 ? 'pronunciation_major' : 'pronunciation_minor';
        counts[scoreType] = (counts[scoreType] ?? 0) + 1;
      }
    }

    return counts;
  }

  private detectMistakeType(segment: string): string {
    const normalized = segment.trim().toLowerCase();
    if (!normalized) return 'other';

    const colonIndex = normalized.indexOf(':');
    if (colonIndex > 0) {
      const raw = normalized.slice(0, colonIndex).trim();
      if (raw) return raw.replace(/\s+/g, '_');
    }

    if (normalized.includes('spell')) return 'spelling';
    if (normalized.includes('punctuation') || normalized.includes('question mark')) return 'punctuation';
    if (normalized.includes('grammar') || normalized.includes('tense')) return 'grammar';
    if (normalized.includes('preposition')) return 'preposition';
    if (normalized.includes('article')) return 'article';
    if (normalized.includes('vocab')) return 'vocabulary';

    return 'other';
  }

  private detectAudioMistakeType(feedback: string | null): string | null {
    if (!feedback) return null;

    const normalized = feedback.toLowerCase();
    if (normalized.includes('excellent pronunciation')) return null;
    if (normalized.includes('good pronunciation')) return 'pronunciation_minor';
    if (normalized.includes('acceptable pronunciation')) return 'pronunciation_minor';
    if (normalized.includes('pronunciation')) return 'pronunciation_major';

    return null;
  }

  private buildFrontendCharts(
    mistakeCountsByType: MistakeCounts,
    progressOverTime: Array<{ date: string; text_score: number; pronunciation_score: number }>,
  ) {
    const sortedMistakes = Object.entries(mistakeCountsByType).sort((a, b) => b[1] - a[1]);

    return {
      mistakesByType: {
        labels: sortedMistakes.map(([label]) => label),
        values: sortedMistakes.map(([, value]) => value),
      },
      progressOverTime: {
        labels: progressOverTime.map((p) => p.date),
        textScores: progressOverTime.map((p) => p.text_score),
        pronunciationScores: progressOverTime.map((p) => p.pronunciation_score),
      },
    };
  }

  private getFromDate(period: Period): Date | null {
    const now = new Date();

    if (period === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }

    if (period === 'month') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d;
    }

    return null;
  }

  private toIsoDate(value: Date | string): string {
    if (value instanceof Date) return value.toISOString().slice(0, 10);

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

    return String(value).slice(0, 10);
  }
}