import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AudioRecord, Task } from '../generated/prisma';

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
