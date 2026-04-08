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
  ): Promise<{ records: { pronunciationScore: number | null; feedback: string | null; createdAt: Date }[] }> {
    const where: any = { language: language.toLowerCase() };
    if (from) {
      where.createdAt = { gte: new Date(from) };
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

  async getNextListeningTask(
    userId: number,
    language: string,
    level: string,
  ): Promise<Task | null> {
    // Cast where clause to any: listeningScores relation is added by the new
    // migration but prisma generate hasn't run locally yet (runs in Docker build).
    return (this.prisma.task as any).findFirst({
      where: {
        language,
        level,
        skill: 'listening',
        OR: [
          // User has never attempted this task
          { listeningScores: { none: { userId } } },
          // User attempted but scored less than 100%
          { listeningScores: { some: { userId, score: { lt: 1.0 } } } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
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
      },
    });
  }

  async upsertListeningScore(userId: number, taskId: number, score: number): Promise<void> {
    // Cast to any: ListeningScore model added by migration, prisma generate runs in Docker build.
    await (this.prisma as any).listeningScore.upsert({
      where: { userId_taskId: { userId, taskId } },
      create: { userId, taskId, score },
      update: { score },
    });
  }

  async getListeningScore(userId: number, taskId: number): Promise<{ score: number } | null> {
    return (this.prisma as any).listeningScore.findUnique({
      where: { userId_taskId: { userId, taskId } },
      select: { score: true },
    });
  }

  async updateTaskAudio(taskId: number, audioUrl: string): Promise<void> {
    await this.prisma.task.update({
      where: { id: taskId },
      data: { audioUrl },
    });
  }
}
