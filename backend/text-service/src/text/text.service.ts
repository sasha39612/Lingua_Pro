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
    language = language.toLowerCase();
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
              const { questions, ...taskFields } = t;
              const record = await this.prisma.task.create({
                data: {
                  ...taskFields,
                  language: normalizedLanguage,
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
}

// we need to import or redeclare simulateAIAnalysis and calculateTextScore
// since they are defined in text.schema.ts we'll export them there and import them here.
import { simulateAIAnalysis, calculateTextScore } from '../graphql/text.schema';
