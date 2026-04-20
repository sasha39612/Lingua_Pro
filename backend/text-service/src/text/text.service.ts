import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class TextService {
  private readonly logger = new Logger(TextService.name);
  private orchestratorUrl: string;

  constructor(
    private prisma: PrismaService,
    private http: HttpService
  ) {
    this.orchestratorUrl = process.env.AI_ORCHESTRATOR_URL || 'http://ai-orchestrator:4005';
  }

  async analyzeText(userId: number, language: string, text: string, skill = 'writing') {
    language = language.toLowerCase();
    let corrected = text;
    let feedback = 'Great work! No obvious errors detected.';
    let textScore: number | null = null;

    try {
      const resp = await lastValueFrom(
        this.http.post(`${this.orchestratorUrl}/text/analyze`, { text, language })
      );
      if (resp.data) {
        corrected = resp.data.correctedText || corrected;
        feedback = resp.data.feedback || feedback;
        textScore = typeof resp.data.textScore === 'number' ? resp.data.textScore : null;
        if (textScore === null) {
          textScore = calculateTextScore(text, { feedback });
        }
      }
    } catch (err: any) {
      // fallback to local analysis
      this.logger.warn('ai-orchestrator unavailable, using local analysis', err?.message || err);
      const { corrected: c, feedback: f } = simulateAIAnalysis(text);
      corrected = c;
      feedback = f;
      textScore = calculateTextScore(text, { feedback });
    }

    try {
      const record = await this.prisma.text.create({
        data: {
          userId,
          language,
          skill,
          originalText: text,
          correctedText: corrected,
          textScore,
          feedback
        }
      });

      return record;
    } catch (err: any) {
      this.logger.error('failed to persist text analysis', err?.message || err);
      return {
        id: -1,
        userId,
        language,
        originalText: text,
        correctedText: corrected,
        textScore,
        feedback,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        persisted: false
      };
    }
  }

  async recordScore(userId: number, language: string, skill: string, score: number) {
    language = (language || 'english').toLowerCase();
    try {
      const record = await this.prisma.text.create({
        data: {
          userId,
          language,
          skill,
          originalText: '',
          textScore: score,
          feedback: null,
        },
      });
      return { id: record.id, skill, score, createdAt: record.createdAt };
    } catch (err: any) {
      this.logger.error('failed to record score', err?.message || err);
      return { id: -1, skill, score, createdAt: new Date().toISOString() };
    }
  }

  async getTextsByLanguage(language: string, from?: string, skill?: string, userId?: string) {
    const where: any = { language: language.toLowerCase() };
    if (from) where.createdAt = { gte: new Date(from) };
    if (skill) where.skill = skill;
    if (userId) where.userId = parseInt(userId, 10);
    try {
      const texts = await this.prisma.text.findMany({
        where,
        select: { textScore: true, feedback: true, createdAt: true, skill: true },
        orderBy: { createdAt: 'asc' },
      });
      return { texts };
    } catch (err: any) {
      this.logger.error('failed to query texts by language', err?.message || err);
      return { texts: [] };
    }
  }

  async getTasks(language: string, level: string, skill?: string, userId?: number | null) {
    language = language.toLowerCase();
    const effectiveSkill = skill || 'reading';
    const db = this.prisma as any;

    // ── Per-user path ────────────────────────────────────────────────────────
    if (userId) {
      let existingSet: any = null;
      try {
        existingSet = await db.userTaskSet.findUnique({
          where: { userId_language_level_skill: { userId, language, level, skill: effectiveSkill } },
        });
      } catch (err: any) {
        this.logger.error('failed to query user task set', err?.message || err);
      }

      if (existingSet) {
        const completed = existingSet.score !== null && existingSet.score >= 0.95;
        if (!completed && existingSet.taskIds?.length > 0) {
          try {
            const tasks = await this.prisma.task.findMany({
              where: { id: { in: existingSet.taskIds } },
            });
            if (tasks.length > 0) return tasks;
          } catch (err: any) {
            this.logger.error('failed to fetch tasks by ids', err?.message || err);
          }
        }
        // completed or ids missing — fall through to generate fresh tasks below
      }
    }

    // ── Shared pool / generate ───────────────────────────────────────────────
    let tasks: any[] = [];
    try {
      tasks = await this.prisma.task.findMany({ where: { language, level, skill: effectiveSkill } });
      // Reading tasks must have questions stored; skip any that are missing them
      // (can happen if tasks were cached before the questions column was added)
      if (effectiveSkill === 'reading') {
        tasks = tasks.filter((t: any) => t.questions != null);
      }
    } catch (err: any) {
      this.logger.error('failed to query cached tasks', err?.message || err);
    }

    if (tasks.length === 0) {
      try {
        const resp = await lastValueFrom(
          this.http.post(`${this.orchestratorUrl}/tasks/generate`, { language, level, skill: effectiveSkill })
        );
        if (resp.data?.tasks) {
          const created: any[] = [];
          for (const t of resp.data.tasks) {
            const normalizedLanguage = t.language?.toLowerCase() ?? language;
            try {
              const { questions, focusPhonemes, ...taskFields } = t;
              const record = await this.prisma.task.create({
                data: {
                  ...taskFields,
                  language: normalizedLanguage,
                  focusPhonemes: focusPhonemes ?? [],
                  ...(questions != null ? { questions } : {}),
                },
              });
              created.push(record);
            } catch (err: any) {
              this.logger.warn('failed to persist generated task', err?.message || err);
              // Return the generated data even without DB persistence so the caller
              // always gets a usable task (mirrors how analyzeText handles DB failures)
              created.push({ ...t, id: -1, language: normalizedLanguage, createdAt: new Date().toISOString() });
            }
          }
          tasks = created;
        }
      } catch (err: any) {
        this.logger.error('failed to generate tasks from orchestrator', err?.message || err);
      }
    }

    // Assign tasks to user if authenticated
    if (userId && tasks.length > 0) {
      const db = this.prisma as any;
      const assignedIds = tasks.slice(0, 3).map((t: any) => t.id);
      try {
        await db.userTaskSet.upsert({
          where: { userId_language_level_skill: { userId, language, level, skill: effectiveSkill } },
          create: { userId, language, level, skill: effectiveSkill, taskIds: assignedIds },
          update: { taskIds: assignedIds, score: null },
        });
      } catch (err: any) {
        this.logger.error('failed to save user task set', err?.message || err);
      }
      return tasks.slice(0, 3);
    }

    return tasks;
  }

  // ─── Admin aggregation ──────────────────────────────────────────────────────

  async getAdminSummary(period: Period, language?: string) {
    const fromDate = periodToFromDate(period);
    const lang = language ? language.toLowerCase() : undefined;

    const [
      byLanguage,
      bySkill,
      topUsers,
      dailySessions,
      dailyActiveEst,
      activeUserCount,
      completedTaskCount,
    ] = await Promise.all([
      this.adminByLanguage(fromDate, lang),
      this.adminBySkill(fromDate, lang),
      this.adminTopUsers(fromDate, lang),
      this.adminDailyCounts(fromDate, lang),
      this.adminDailyActiveEstimate(fromDate, lang),
      this.adminActiveUserCount(fromDate),
      this.adminCompletedTaskCount(fromDate),
    ]);

    const totalSessions = byLanguage.reduce((s, r) => s + r.count, 0);

    return {
      period,
      language: lang ?? null,
      total_sessions: totalSessions,
      by_language: byLanguage,
      by_skill: bySkill,
      top_users: topUsers,
      time_series: {
        daily_sessions: dailySessions,
        daily_active_user_estimate: dailyActiveEst,
      },
      funnel: {
        with_text_activity: activeUserCount,
        completed_task: completedTaskCount,
      },
    };
  }

  // buildGroupByQuery interface (mirrors audio-service):
  //   config: { fromDate: Date; language?: string; skill?: string; limit?: number }
  // Multi-branch raw SQL — one branch per filter combination so we never
  // concatenate user input into SQL strings.

  private async adminByLanguage(fromDate: Date, language?: string) {
    type Row = { language: string; count: number; score_sum: number | null };
    let rows: Row[];
    if (language) {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT language, COUNT(*)::int AS count, SUM(text_score)::float AS score_sum
        FROM texts
        WHERE created_at >= ${fromDate} AND language = ${language}
        GROUP BY language ORDER BY count DESC
      `;
    } else {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT language, COUNT(*)::int AS count, SUM(text_score)::float AS score_sum
        FROM texts
        WHERE created_at >= ${fromDate}
        GROUP BY language ORDER BY count DESC
      `;
    }
    return rows.map((r) => ({
      language: r.language,
      count: r.count,
      avg_score: safeAvg(r.score_sum ?? 0, r.count),
    }));
  }

  private async adminBySkill(fromDate: Date, language?: string) {
    type Row = { skill: string; count: number; score_sum: number | null };
    let rows: Row[];
    if (language) {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT skill, COUNT(*)::int AS count, SUM(text_score)::float AS score_sum
        FROM texts
        WHERE created_at >= ${fromDate} AND language = ${language}
        GROUP BY skill
      `;
    } else {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT skill, COUNT(*)::int AS count, SUM(text_score)::float AS score_sum
        FROM texts
        WHERE created_at >= ${fromDate}
        GROUP BY skill
      `;
    }
    const result = {
      reading: { count: 0, avg_score: 0 },
      writing: { count: 0, avg_score: 0 },
    };
    for (const r of rows) {
      if (r.skill === 'reading' || r.skill === 'writing') {
        result[r.skill] = {
          count: r.count,
          avg_score: safeAvg(r.score_sum ?? 0, r.count),
        };
      }
    }
    return result;
  }

  private async adminTopUsers(fromDate: Date, language?: string, limit = 20) {
    type Row = { user_id: number; count: number; score_sum: number | null; last_active: Date };
    let rows: Row[];
    if (language) {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT user_id, COUNT(*)::int AS count, SUM(text_score)::float AS score_sum,
               MAX(created_at) AS last_active
        FROM texts
        WHERE created_at >= ${fromDate} AND language = ${language}
        GROUP BY user_id ORDER BY count DESC LIMIT ${limit}
      `;
    } else {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT user_id, COUNT(*)::int AS count, SUM(text_score)::float AS score_sum,
               MAX(created_at) AS last_active
        FROM texts
        WHERE created_at >= ${fromDate}
        GROUP BY user_id ORDER BY count DESC LIMIT ${limit}
      `;
    }
    return rows.map((r) => ({
      userId: Number(r.user_id),
      count: r.count,
      score_sum: r.score_sum ?? 0,
      avg_score: safeAvg(r.score_sum ?? 0, r.count),
      // UTC ISO string — all services must use this format for cross-service string comparison safety
      last_active: r.last_active instanceof Date ? r.last_active.toISOString() : String(r.last_active),
    }));
  }

  private async adminDailyCounts(fromDate: Date, language?: string) {
    type Row = { date: Date; count: number };
    let rows: Row[];
    if (language) {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date AS date,
               COUNT(*)::int AS count
        FROM texts
        WHERE created_at >= ${fromDate} AND language = ${language}
        GROUP BY 1 ORDER BY 1 ASC
      `;
    } else {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date AS date,
               COUNT(*)::int AS count
        FROM texts
        WHERE created_at >= ${fromDate}
        GROUP BY 1 ORDER BY 1 ASC
      `;
    }
    return rows.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
      count: r.count,
    }));
  }

  private async adminDailyActiveEstimate(fromDate: Date, language?: string) {
    type Row = { date: Date; count: number };
    let rows: Row[];
    if (language) {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date AS date,
               COUNT(DISTINCT user_id)::int AS count
        FROM texts
        WHERE created_at >= ${fromDate} AND language = ${language}
        GROUP BY 1 ORDER BY 1 ASC
      `;
    } else {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date AS date,
               COUNT(DISTINCT user_id)::int AS count
        FROM texts
        WHERE created_at >= ${fromDate}
        GROUP BY 1 ORDER BY 1 ASC
      `;
    }
    return rows.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
      count: r.count,
    }));
  }

  async adminActiveUserCount(fromDate: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(DISTINCT user_id)::int AS count FROM texts WHERE created_at >= ${fromDate}
    `;
    return rows[0]?.count ?? 0;
  }

  async adminActiveUserIds(fromDate: Date, language?: string): Promise<Array<{ date: string; userIds: number[] }>> {
    // Exact mode: returns userId arrays per day for precise cross-service DAU dedup.
    // Hard-gated to period=week + x-debug-mode header at the controller level.
    //
    // IMPORTANT: LIMIT is applied BEFORE the subquery returns rows — not after DISTINCT.
    // ARRAY_AGG(DISTINCT ...) + LIMIT would still build the full dedup hash set in Postgres
    // memory before capping. The subquery-LIMIT pattern caps rows first; result is not
    // perfectly distinct (duplicates within the cap window are possible) but memory is bounded.
    // For a debug/verification tool this tradeoff is correct.
    const maxPerDay = Number(process.env.MAX_EXACT_IDS_PER_DAY ?? 5_000);
    const maxTotal  = Number(process.env.MAX_EXACT_IDS_TOTAL   ?? 50_000);

    type Row = { date: Date; user_ids: number[] };
    let rows: Row[];
    if (language) {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT d.date,
               ARRAY(
                 SELECT user_id FROM (
                   SELECT user_id FROM texts
                   WHERE created_at >= ${fromDate}
                     AND language = ${language}
                     AND DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date = d.date
                   LIMIT ${maxPerDay}
                 ) t
               ) AS user_ids
        FROM (
          SELECT DISTINCT DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date AS date
          FROM texts WHERE created_at >= ${fromDate} AND language = ${language}
        ) d
        ORDER BY d.date ASC
      `;
    } else {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT d.date,
               ARRAY(
                 SELECT user_id FROM (
                   SELECT user_id FROM texts
                   WHERE created_at >= ${fromDate}
                     AND DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date = d.date
                   LIMIT ${maxPerDay}
                 ) t
               ) AS user_ids
        FROM (
          SELECT DISTINCT DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date AS date
          FROM texts WHERE created_at >= ${fromDate}
        ) d
        ORDER BY d.date ASC
      `;
    }

    const result = rows.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
      userIds: (r.user_ids ?? []).map(Number),
    }));

    // Post-collection total cap as a second safety layer
    const totalIds = result.reduce((sum, r) => sum + r.userIds.length, 0);
    if (totalIds > maxTotal) {
      throw new Error(
        `Exact mode returned ${totalIds} IDs — exceeds MAX_EXACT_IDS_TOTAL=${maxTotal}. Lower MAX_EXACT_IDS_PER_DAY or use estimated mode.`,
      );
    }

    return result;
  }

  private async adminCompletedTaskCount(fromDate: Date): Promise<number> {
    const db = this.prisma as any;
    try {
      const rows = await db.$queryRaw`
        SELECT COUNT(DISTINCT user_id)::int AS count FROM user_task_sets WHERE created_at >= ${fromDate}
      `;
      return rows[0]?.count ?? 0;
    } catch {
      return 0;
    }
  }
}

// ─── Admin aggregation helpers ────────────────────────────────────────────────
// All raw SQL uses DATE_TRUNC('day', created_at AT TIME ZONE 'UTC') for timezone-
// consistent grouping. Never DATE(created_at) — that uses DB server local TZ.
//
// buildGroupByQuery interface (mirrors audio-service for consistency):
//   config: { fromDate: Date; language?: string; skill?: string; limit?: number }
// Actual SQL is multi-branch (same pattern as audio.repository.ts).

type Period = 'week' | 'month' | 'all';

function periodToFromDate(period: Period): Date {
  const now = new Date();
  if (period === 'week')  return new Date(now.getTime() - 7  * 24 * 3600 * 1000);
  if (period === 'month') return new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  return new Date(0); // 'all' — from epoch
}

function safeAvg(scoreSum: number, count: number): number {
  return count > 0 ? scoreSum / count : 0;
}

// we need to import or redeclare simulateAIAnalysis and calculateTextScore
// since they are defined in text.schema.ts we'll export them there and import them here.
import { simulateAIAnalysis, calculateTextScore } from '../graphql/text.schema';
