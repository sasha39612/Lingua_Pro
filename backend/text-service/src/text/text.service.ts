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

  async analyzeText(userId: number, language: string, text: string) {
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

  async getTasks(language: string, level: string, skill?: string) {
    const where: any = { language, level };
    if (skill) {
      where.skill = skill;
    }
    let tasks: any[] = [];
    try {
      tasks = await this.prisma.task.findMany({ where });
    } catch (err: any) {
      this.logger.error('failed to query cached tasks', err?.message || err);
      tasks = [];
    }
    if (tasks.length === 0) {
      try {
        const resp = await lastValueFrom(
          this.http.post(`${this.orchestratorUrl}/tasks/generate`, { language, level, skill })
        );
        if (resp.data?.tasks) {
          tasks = resp.data.tasks;
          // persist tasks for future queries
          for (const t of tasks) {
            try {
              await this.prisma.task.create({ data: t });
            } catch (err: any) {
              this.logger.warn('failed to persist generated task', err?.message || err);
            }
          }
        }
      } catch (err: any) {
        this.logger.error('failed to generate tasks from orchestrator', err?.message || err);
        tasks = [];
      }
    }
    return tasks;
  }
}

// we need to import or redeclare simulateAIAnalysis and calculateTextScore
// since they are defined in text.schema.ts we'll export them there and import them here.
import { simulateAIAnalysis, calculateTextScore } from '../graphql/text.schema';
