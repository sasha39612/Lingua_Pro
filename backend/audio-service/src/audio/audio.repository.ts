import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AudioRecord, Task } from '../generated/prisma';

// ─── Admin aggregation module-level helpers ──────────────────────────────────
// Mirrors the safeAvg / periodToFromDate helpers in text-service for a
// consistent buildGroupByQuery interface across services.

export type AudioPeriod = 'week' | 'month' | 'all';

export function audioPeriodToFromDate(period: AudioPeriod): Date {
  const now = new Date();
  if (period === 'week')  return new Date(now.getTime() - 7  * 24 * 3600 * 1000);
  if (period === 'month') return new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  return new Date(0); // 'all' — from epoch
}

export function audioSafeAvg(scoreSum: number, count: number): number {
  return count > 0 ? scoreSum / count : 0;
}

interface CreateAudioRecordInput {
  userId: number;
  language: string;
  transcript: string;
  pronunciationScore: number;
  audioUrl: string;
  feedback: string;
}

interface CreateTaskInput {
  language: string;
  level: string;
  skill: string;
  prompt: string;
  audioUrl?: string | null;
  referenceText?: string | null;
  answerOptions: string[];
  correctAnswer?: string | null;
  questionsJson?: string | null;
}

@Injectable()
export class AudioRepository {
  constructor(private prisma: PrismaService) {}

  async createAudioRecord(data: CreateAudioRecordInput): Promise<AudioRecord> {
    return this.prisma.audioRecord.create({
      data: {
        userId: data.userId,
        language: data.language,
        transcript: data.transcript,
        pronunciationScore: data.pronunciationScore,
        audioUrl: data.audioUrl,
        feedback: data.feedback
      }
    });
  }

  async getAudioRecord(id: number): Promise<AudioRecord | null> {
    return this.prisma.audioRecord.findUnique({
      where: { id }
    });
  }

  async getAudioRecordsByUserId(userId: number): Promise<AudioRecord[]> {
    return this.prisma.audioRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getUserAudioStats(userId: number): Promise<{
    totalRecords: number;
    averagePronunciationScore: number;
    languages: string[];
  }> {
    const records = await this.prisma.audioRecord.findMany({
      where: { userId }
    });

    if (records.length === 0) {
      return {
        totalRecords: 0,
        averagePronunciationScore: 0,
        languages: []
      };
    }

    const totalScore = records.reduce((sum: number, record: AudioRecord) => sum + (record.pronunciationScore || 0), 0);
    const languages = [...new Set(records.map((r: AudioRecord) => r.language))];

    return {
      totalRecords: records.length,
      averagePronunciationScore: totalScore / records.length,
      languages
    };
  }

  async getRecordsByLanguage(
    language: string,
    from?: string,
    userId?: string,
  ): Promise<{ records: { pronunciationScore: number | null; feedback: string | null; createdAt: Date }[] }> {
    const where: any = { language: language.toLowerCase() };
    if (from) {
      where.createdAt = { gte: new Date(from) };
    }
    if (userId) {
      where.userId = parseInt(userId, 10);
    }
    const records = await this.prisma.audioRecord.findMany({
      where,
      select: { pronunciationScore: true, feedback: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return { records };
  }

  async getListeningTasks(language: string, level?: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        language,
        skill: 'listening',
        ...(level ? { level } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  }

  async getTaskById(id: number): Promise<Task | null> {
    return this.prisma.task.findUnique({
      where: { id }
    });
  }

  // ── Listening task flow ─────────────────────────────────────────────────────
  // All methods below use $queryRaw / $executeRaw so they work regardless of
  // whether `prisma generate` has been re-run after adding ListeningScore.
  // The only requirement is that the SQL migration has been applied.

  async getNextListeningTask(
    userId: number,
    language: string,
    level: string,
  ): Promise<Task | null> {
    // Step 1 — fetch matching tasks via the existing (known) Prisma model.
    const tasks = await this.prisma.task.findMany({
      where: { language, level, skill: 'listening' },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    if (tasks.length === 0) return null;

    // Step 2 — find which task IDs the user has already scored 100% on.
    //           Use raw SQL so we don't depend on the Prisma-generated ListeningScore type.
    let completedIds = new Set<number>();
    try {
      const rows = await this.prisma.$queryRaw<{ task_id: number }[]>`
        SELECT task_id FROM listening_scores
        WHERE user_id = ${userId} AND score >= 1.0
      `;
      completedIds = new Set(rows.map((r) => Number(r.task_id)));
    } catch {
      // Table doesn't exist yet (migration pending) — treat all tasks as incomplete.
    }

    // Step 3 — return first task the user hasn't fully completed.
    return tasks.find((t) => !completedIds.has(t.id)) ?? null;
  }

  async createTask(data: CreateTaskInput): Promise<Task> {
    return this.prisma.task.create({
      data: {
        language: data.language,
        level: data.level,
        skill: data.skill,
        prompt: data.prompt,
        audioUrl: data.audioUrl ?? null,
        referenceText: data.referenceText ?? null,
        answerOptions: data.answerOptions,
        correctAnswer: data.correctAnswer ?? null,
        questionsJson: data.questionsJson ?? null,
      },
    });
  }

  async upsertListeningScore(userId: number, taskId: number, score: number): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO listening_scores (user_id, task_id, score, created_at, updated_at)
      VALUES (${userId}, ${taskId}, ${score}, NOW(), NOW())
      ON CONFLICT (user_id, task_id) DO UPDATE
        SET score = EXCLUDED.score, updated_at = NOW()
    `;
  }

  async getListeningScore(userId: number, taskId: number): Promise<{ score: number } | null> {
    const rows = await this.prisma.$queryRaw<{ score: number }[]>`
      SELECT score FROM listening_scores
      WHERE user_id = ${userId} AND task_id = ${taskId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  async updateTaskAudio(taskId: number, audioUrl: string): Promise<void> {
    await this.prisma.task.update({
      where: { id: taskId },
      data: { audioUrl },
    });
  }

  // ── Admin aggregation helpers ───────────────────────────────────────────────
  // All raw SQL uses DATE_TRUNC('day', created_at AT TIME ZONE 'UTC') for consistent
  // UTC-day grouping. Never DATE(created_at) — that uses DB server local TZ.
  // buildGroupByQuery interface (mirrors text-service for consistency):
  //   config: { fromDate: Date; language?: string; limit?: number }
  // Multi-branch raw SQL per filter combination — never concatenate user input into SQL.

  async adminByLanguage(fromDate: Date, language?: string): Promise<Array<{
    language: string;
    speaking_count: number;
    listening_count: number;
    avg_pronunciation_score: number;
  }>> {
    type SpRow = { language: string; speaking_count: number; score_sum: number | null };
    type LsRow = { language: string; listening_count: number };
    let spRows: SpRow[];
    let lsRows: LsRow[];

    if (language) {
      [spRows, lsRows] = await Promise.all([
        this.prisma.$queryRaw<SpRow[]>`
          SELECT language, COUNT(*)::int AS speaking_count,
                 SUM(pronunciation_score)::float AS score_sum
          FROM audio_records
          WHERE created_at >= ${fromDate} AND language = ${language}
          GROUP BY language
        `,
        this.prisma.$queryRaw<LsRow[]>`
          SELECT t.language, COUNT(*)::int AS listening_count
          FROM listening_scores ls
          INNER JOIN tasks t ON t.id = ls.task_id
          WHERE ls.created_at >= ${fromDate} AND t.language = ${language}
          GROUP BY t.language
        `,
      ]);
    } else {
      [spRows, lsRows] = await Promise.all([
        this.prisma.$queryRaw<SpRow[]>`
          SELECT language, COUNT(*)::int AS speaking_count,
                 SUM(pronunciation_score)::float AS score_sum
          FROM audio_records
          WHERE created_at >= ${fromDate}
          GROUP BY language
        `,
        this.prisma.$queryRaw<LsRow[]>`
          SELECT t.language, COUNT(*)::int AS listening_count
          FROM listening_scores ls
          INNER JOIN tasks t ON t.id = ls.task_id
          WHERE ls.created_at >= ${fromDate}
          GROUP BY t.language
        `,
      ]);
    }

    const lsMap = new Map(lsRows.map((r) => [r.language, r.listening_count]));
    const allLangs = new Set([...spRows.map((r) => r.language), ...lsRows.map((r) => r.language)]);
    return [...allLangs]
      .map((lang) => {
        const sp = spRows.find((r) => r.language === lang);
        return {
          language: lang,
          speaking_count: sp?.speaking_count ?? 0,
          listening_count: lsMap.get(lang) ?? 0,
          avg_pronunciation_score: audioSafeAvg(sp?.score_sum ?? 0, sp?.speaking_count ?? 0),
        };
      })
      .sort((a, b) => (b.speaking_count + b.listening_count) - (a.speaking_count + a.listening_count));
  }

  async adminTopUsersSpeaking(fromDate: Date, language?: string, limit = 20) {
    type Row = { user_id: number; count: number; score_sum: number | null; last_active: Date };
    let rows: Row[];
    if (language) {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT user_id, COUNT(*)::int AS count, SUM(pronunciation_score)::float AS score_sum,
               MAX(created_at) AS last_active
        FROM audio_records
        WHERE created_at >= ${fromDate} AND language = ${language}
        GROUP BY user_id ORDER BY count DESC LIMIT ${limit}
      `;
    } else {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT user_id, COUNT(*)::int AS count, SUM(pronunciation_score)::float AS score_sum,
               MAX(created_at) AS last_active
        FROM audio_records
        WHERE created_at >= ${fromDate}
        GROUP BY user_id ORDER BY count DESC LIMIT ${limit}
      `;
    }
    return rows.map((r) => ({
      userId: Number(r.user_id),
      count: r.count,
      score_sum: r.score_sum ?? 0,
      avg_score: audioSafeAvg(r.score_sum ?? 0, r.count),
      last_active: r.last_active instanceof Date ? r.last_active.toISOString() : String(r.last_active),
    }));
  }

  async adminTopUsersListening(fromDate: Date, language?: string, limit = 20) {
    type Row = { user_id: number; count: number; score_sum: number | null; last_active: Date };
    let rows: Row[];
    if (language) {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT ls.user_id, COUNT(*)::int AS count, SUM(ls.score)::float AS score_sum,
               MAX(ls.created_at) AS last_active
        FROM listening_scores ls
        INNER JOIN tasks t ON t.id = ls.task_id
        WHERE ls.created_at >= ${fromDate} AND t.language = ${language}
        GROUP BY ls.user_id ORDER BY count DESC LIMIT ${limit}
      `;
    } else {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT ls.user_id, COUNT(*)::int AS count, SUM(ls.score)::float AS score_sum,
               MAX(ls.created_at) AS last_active
        FROM listening_scores ls
        WHERE ls.created_at >= ${fromDate}
        GROUP BY ls.user_id ORDER BY count DESC LIMIT ${limit}
      `;
    }
    return rows.map((r) => ({
      userId: Number(r.user_id),
      count: r.count,
      score_sum: r.score_sum ?? 0,
      avg_score: audioSafeAvg(r.score_sum ?? 0, r.count),
      last_active: r.last_active instanceof Date ? r.last_active.toISOString() : String(r.last_active),
    }));
  }

  async adminDailySpeakingCounts(fromDate: Date, language?: string) {
    type Row = { date: Date; count: number };
    let rows: Row[];
    if (language) {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date AS date,
               COUNT(*)::int AS count
        FROM audio_records
        WHERE created_at >= ${fromDate} AND language = ${language}
        GROUP BY 1 ORDER BY 1 ASC
      `;
    } else {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date AS date,
               COUNT(*)::int AS count
        FROM audio_records
        WHERE created_at >= ${fromDate}
        GROUP BY 1 ORDER BY 1 ASC
      `;
    }
    return rows.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
      count: r.count,
    }));
  }

  async adminDailyListeningCounts(fromDate: Date, language?: string) {
    type Row = { date: Date; count: number };
    let rows: Row[];
    if (language) {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT DATE_TRUNC('day', ls.created_at AT TIME ZONE 'UTC')::date AS date,
               COUNT(*)::int AS count
        FROM listening_scores ls
        INNER JOIN tasks t ON t.id = ls.task_id
        WHERE ls.created_at >= ${fromDate} AND t.language = ${language}
        GROUP BY 1 ORDER BY 1 ASC
      `;
    } else {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT DATE_TRUNC('day', ls.created_at AT TIME ZONE 'UTC')::date AS date,
               COUNT(*)::int AS count
        FROM listening_scores ls
        WHERE ls.created_at >= ${fromDate}
        GROUP BY 1 ORDER BY 1 ASC
      `;
    }
    return rows.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
      count: r.count,
    }));
  }

  async adminDailyActiveEstimate(fromDate: Date, language?: string) {
    type Row = { date: Date; count: number };
    let rows: Row[];
    if (language) {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date AS date,
               COUNT(DISTINCT user_id)::int AS count
        FROM audio_records
        WHERE created_at >= ${fromDate} AND language = ${language}
        GROUP BY 1 ORDER BY 1 ASC
      `;
    } else {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date AS date,
               COUNT(DISTINCT user_id)::int AS count
        FROM audio_records
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
      SELECT COUNT(DISTINCT user_id)::int AS count FROM audio_records WHERE created_at >= ${fromDate}
    `;
    return rows[0]?.count ?? 0;
  }

  async adminActiveUserIds(fromDate: Date, language?: string): Promise<Array<{ date: string; userIds: number[] }>> {
    // Exact mode: returns userId arrays per day for precise cross-service DAU dedup.
    // Hard-gated to period=week + x-debug-mode header at the controller level.
    //
    // LIMIT is applied before the subquery collects rows — not after DISTINCT — so Postgres
    // never builds a large dedup hash set in memory. Result may contain duplicates within
    // the per-day cap window; acceptable for a debug/verification tool.
    const maxPerDay = Number(process.env.MAX_EXACT_IDS_PER_DAY ?? 5_000);
    const maxTotal  = Number(process.env.MAX_EXACT_IDS_TOTAL   ?? 50_000);

    type Row = { date: Date; user_ids: number[] };
    let rows: Row[];
    if (language) {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT d.date,
               ARRAY(
                 SELECT user_id FROM (
                   SELECT user_id FROM audio_records
                   WHERE created_at >= ${fromDate}
                     AND language = ${language}
                     AND DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date = d.date
                   LIMIT ${maxPerDay}
                 ) t
               ) AS user_ids
        FROM (
          SELECT DISTINCT DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date AS date
          FROM audio_records WHERE created_at >= ${fromDate} AND language = ${language}
        ) d
        ORDER BY d.date ASC
      `;
    } else {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT d.date,
               ARRAY(
                 SELECT user_id FROM (
                   SELECT user_id FROM audio_records
                   WHERE created_at >= ${fromDate}
                     AND DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date = d.date
                   LIMIT ${maxPerDay}
                 ) t
               ) AS user_ids
        FROM (
          SELECT DISTINCT DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date AS date
          FROM audio_records WHERE created_at >= ${fromDate}
        ) d
        ORDER BY d.date ASC
      `;
    }

    const result = rows.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
      userIds: (r.user_ids ?? []).map(Number),
    }));

    const totalIds = result.reduce((sum, r) => sum + r.userIds.length, 0);
    if (totalIds > maxTotal) {
      throw new Error(
        `Exact mode returned ${totalIds} IDs — exceeds MAX_EXACT_IDS_TOTAL=${maxTotal}. Lower MAX_EXACT_IDS_PER_DAY or use estimated mode.`,
      );
    }

    return result;
  }

  async getListeningScoresByLanguage(
    language: string,
    from?: string,
    userId?: string,
  ): Promise<{ score: number; createdAt: Date }[]> {
    try {
      const lang = language.toLowerCase();
      const userIdInt = userId ? parseInt(userId, 10) : null;
      if (from && userIdInt !== null) {
        const rows = await this.prisma.$queryRaw<{ score: number; created_at: Date }[]>`
          SELECT ls.score, ls.created_at
          FROM listening_scores ls
          INNER JOIN tasks t ON t.id = ls.task_id
          WHERE t.language = ${lang}
            AND ls.user_id = ${userIdInt}
            AND ls.created_at >= ${new Date(from)}
          ORDER BY ls.created_at ASC
        `;
        return rows.map((r) => ({ score: r.score, createdAt: r.created_at }));
      } else if (from) {
        const rows = await this.prisma.$queryRaw<{ score: number; created_at: Date }[]>`
          SELECT ls.score, ls.created_at
          FROM listening_scores ls
          INNER JOIN tasks t ON t.id = ls.task_id
          WHERE t.language = ${lang}
            AND ls.created_at >= ${new Date(from)}
          ORDER BY ls.created_at ASC
        `;
        return rows.map((r) => ({ score: r.score, createdAt: r.created_at }));
      } else if (userIdInt !== null) {
        const rows = await this.prisma.$queryRaw<{ score: number; created_at: Date }[]>`
          SELECT ls.score, ls.created_at
          FROM listening_scores ls
          INNER JOIN tasks t ON t.id = ls.task_id
          WHERE t.language = ${lang}
            AND ls.user_id = ${userIdInt}
          ORDER BY ls.created_at ASC
        `;
        return rows.map((r) => ({ score: r.score, createdAt: r.created_at }));
      } else {
        const rows = await this.prisma.$queryRaw<{ score: number; created_at: Date }[]>`
          SELECT ls.score, ls.created_at
          FROM listening_scores ls
          INNER JOIN tasks t ON t.id = ls.task_id
          WHERE t.language = ${lang}
          ORDER BY ls.created_at ASC
        `;
        return rows.map((r) => ({ score: r.score, createdAt: r.created_at }));
      }
    } catch (err: any) {
      // Log so migration/DB issues are visible in service logs rather than silently ignored
      console.error('[AudioRepository] getListeningScoresByLanguage failed:', err?.message ?? err);
      return [];
    }
  }
}
