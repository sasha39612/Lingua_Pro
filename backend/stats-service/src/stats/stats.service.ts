import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Period = 'week' | 'month' | 'all';

type AggregateRow = {
  avg_text_score: number | null;
  avg_pronunciation_score: number | null;
  mistakes_total: number | null;
};

type HistoryRow = {
  date: Date | string;
  text_score: number | null;
  pronunciation_score: number | null;
};

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(language: string, period: Period) {
    const normalizedLanguage = language.trim().toUpperCase();
    const fromDate = this.getFromDate(period);

    const aggregate = await this.prisma.$queryRaw<AggregateRow[]>`
      SELECT
        (
          SELECT AVG(t.text_score)::float
          FROM texts t
          JOIN users u ON u.id = t.user_id
          WHERE u.language = ${normalizedLanguage}
            AND (CAST(${fromDate} AS timestamp) IS NULL OR t.created_at >= CAST(${fromDate} AS timestamp))
        ) AS avg_text_score,
        (
          SELECT AVG(a.pronunciation_score)::float
          FROM audio_records a
          JOIN users u ON u.id = a.user_id
          WHERE u.language = ${normalizedLanguage}
            AND (CAST(${fromDate} AS timestamp) IS NULL OR a.created_at >= CAST(${fromDate} AS timestamp))
        ) AS avg_pronunciation_score,
        (
          SELECT COALESCE(SUM(COALESCE(t.mistakes_count, 0)), 0)::int
          FROM texts t
          JOIN users u ON u.id = t.user_id
          WHERE u.language = ${normalizedLanguage}
            AND (CAST(${fromDate} AS timestamp) IS NULL OR t.created_at >= CAST(${fromDate} AS timestamp))
        ) AS mistakes_total
    `;

    const history = await this.prisma.$queryRaw<HistoryRow[]>`
      WITH text_daily AS (
        SELECT
          DATE(t.created_at) AS date,
          AVG(t.text_score)::float AS text_score
        FROM texts t
        JOIN users u ON u.id = t.user_id
        WHERE u.language = ${normalizedLanguage}
          AND (CAST(${fromDate} AS timestamp) IS NULL OR t.created_at >= CAST(${fromDate} AS timestamp))
        GROUP BY DATE(t.created_at)
      ),
      audio_daily AS (
        SELECT
          DATE(a.created_at) AS date,
          AVG(a.pronunciation_score)::float AS pronunciation_score
        FROM audio_records a
        JOIN users u ON u.id = a.user_id
        WHERE u.language = ${normalizedLanguage}
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

    const row = aggregate[0] ?? {
      avg_text_score: null,
      avg_pronunciation_score: null,
      mistakes_total: 0,
    };

    return {
      language: normalizedLanguage,
      period,
      avg_text_score: row.avg_text_score ?? 0,
      avg_pronunciation_score: row.avg_pronunciation_score ?? 0,
      mistakes_total: row.mistakes_total ?? 0,
      history: history.map((h: HistoryRow) => ({
        date: this.toIsoDate(h.date),
        text_score: h.text_score ?? 0,
        pronunciation_score: h.pronunciation_score ?? 0,
      })),
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