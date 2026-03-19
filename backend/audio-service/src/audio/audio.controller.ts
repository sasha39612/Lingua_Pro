import { Controller, Post, Body, BadRequestException, Get, Param, Query } from '@nestjs/common';
import { AudioService } from './audio.service';

interface CheckAudioRequest {
  userId: string;
  language: string;
  audioUrl: string;
  expectedText?: string;
}

interface CheckAudioResponse {
  id: number;
  userId: number;
  language: string;
  transcript: string;
  pronunciationScore: number;
  feedback: string;
  audioUrl: string;
  confidence: number;
  phonemeHints: string[];
  createdAt: Date;
}

interface AnalyzeBase64Request {
  audioBase64: string;
  mimeType?: string;
  language: string;
  userId: string;
  expectedText?: string;
}

interface EvaluateComprehensionRequest {
  userAnswer: string;
  correctAnswer: string;
}

interface GenerateComprehensionRequest {
  taskId: string;
}

@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post('analyze-base64')
  async analyzeBase64(@Body() body: AnalyzeBase64Request) {
    const { audioBase64, mimeType, language, userId, expectedText } = body;
    if (!audioBase64 || !language || !userId) {
      throw new BadRequestException('audioBase64, language, and userId are required');
    }
    return this.audioService.analyzeBase64(audioBase64, mimeType || 'audio/webm', language, userId, expectedText);
  }

  @Post('check')
  async checkAudio(@Body() body: CheckAudioRequest): Promise<CheckAudioResponse> {
    const { userId, language, audioUrl, expectedText } = body;

    if (!userId || !language || !audioUrl) {
      throw new BadRequestException('userId, language, and audioUrl are required');
    }

    return this.audioService.processAudio(userId, language, audioUrl, expectedText);
  }

  @Get('records/:userId')
  async getAudioRecords(@Param('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.audioService.getAudioRecords(userId);
  }

  @Get('record/:id')
  async getAudioRecord(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('id is required');
    }
    return this.audioService.getAudioRecord(id);
  }

  @Get('stats/:userId')
  async getUserStats(@Param('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.audioService.getUserStats(userId);
  }

  @Get('listening-tasks')
  async getListeningTasks(@Query('language') language: string, @Query('level') level?: string) {
    if (!language) {
      throw new BadRequestException('language is required');
    }
    return this.audioService.getListeningTasks(language, level);
  }

  @Get('by-language')
  async byLanguage(@Query('language') language: string, @Query('from') from?: string) {
    if (!language) {
      throw new BadRequestException('language is required');
    }
    return this.audioService.getRecordsByLanguage(language, from);
  }

  @Post('comprehension/evaluate')
  async evaluateComprehension(@Body() body: EvaluateComprehensionRequest) {
    const { userAnswer, correctAnswer } = body;
    if (!userAnswer || !correctAnswer) {
      throw new BadRequestException('userAnswer and correctAnswer are required');
    }
    return this.audioService.evaluateComprehension(userAnswer, correctAnswer);
  }

  @Post('comprehension/generate')
  async generateComprehension(@Body() body: GenerateComprehensionRequest) {
    const { taskId } = body;
    if (!taskId) {
      throw new BadRequestException('taskId is required');
    }
    return this.audioService.generateComprehension(taskId);
  }
}