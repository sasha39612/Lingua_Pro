import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AudioRecord } from '@prisma/client';

interface CreateAudioRecordInput {
  userId: number;
  language: string;
  transcript: string;
  pronunciationScore: number;
  audioUrl: string;
  feedback: string;
}

interface UpdateAudioRecordInput {
  transcript?: string;
  pronunciationScore?: number;
  feedback?: string;
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

  async getAudioRecordsByLanguage(language: string): Promise<AudioRecord[]> {
    return this.prisma.audioRecord.findMany({
      where: { language },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateAudioRecord(id: number, data: UpdateAudioRecordInput): Promise<AudioRecord> {
    return this.prisma.audioRecord.update({
      where: { id },
      data
    });
  }

  async deleteAudioRecord(id: number): Promise<AudioRecord> {
    return this.prisma.audioRecord.delete({
      where: { id }
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

    const totalScore = records.reduce((sum, record) => sum + (record.pronunciationScore || 0), 0);
    const languages = [...new Set(records.map(r => r.language))];

    return {
      totalRecords: records.length,
      averagePronunciationScore: totalScore / records.length,
      languages
    };
  }
}
