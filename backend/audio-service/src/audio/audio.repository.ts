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
}
