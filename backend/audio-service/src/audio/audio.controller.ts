import { Controller, Post, Body, BadRequestException, ForbiddenException, Get, Param, Query, Headers, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AudioService } from './audio.service';
import { validateAudioBase64 } from './audio-validation';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[startup] Required env var ${name} is not set`);
  return v;
}

const AUDIO_INTERNAL_SECRET = requireEnv('INTERNAL_SERVICE_SECRET');
const AUDIO_ALLOWED_SERVICES = new Set(['stats-service', 'api-gateway']);

function requireAudioInternalToken(token: string | undefined, service: string | undefined): void {
  if (!AUDIO_INTERNAL_SECRET || token !== AUDIO_INTERNAL_SECRET || !service || !AUDIO_ALLOWED_SERVICES.has(service)) {
    throw new ForbiddenException('Internal access only');
  }
}

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

interface SubmitListeningAnswersRequest {
  taskId: number;
  answers: Array<number | string>;
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
    const resolvedMime = mimeType || 'audio/webm';
    // Validate size, MIME type, and magic bytes before anything else touches the payload.
    const audioBuffer = validateAudioBase64(audioBase64, resolvedMime);
    return this.audioService.analyzeBase64(audioBuffer, resolvedMime, language, userId, expectedText);
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
  async byLanguage(
    @Query('language') language: string,
    @Query('from') from?: string,
    @Query('userId') userId?: string,
  ) {
    if (!language) {
      throw new BadRequestException('language is required');
    }
    return this.audioService.getRecordsByLanguage(language, from, userId);
  }

  @Get('listening-by-language')
  async listeningByLanguage(
    @Query('language') language: string,
    @Query('from') from?: string,
    @Query('userId') userId?: string,
  ) {
    if (!language) {
      throw new BadRequestException('language is required');
    }
    return this.audioService.getListeningScoresByLanguage(language, from, userId);
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

  // ── Listening task flow ─────────────────────────────────────────────────────

  @Get('listening-task')
  async getListeningTask(
    @Query('language') language: string,
    @Query('level') level: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!language || !level) {
      throw new BadRequestException('language and level are required');
    }
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }
    return this.audioService.getListeningTask(userId, language, level);
  }

  @Post('listening-task/stream')
  async streamListeningTask(
    @Body('language') language: string,
    @Body('level') level: string,
    @Body('topic') topic: string | undefined,
    @Headers('x-user-id') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!language || !level) {
      res.status(400).json({ error: 'language and level are required' });
      return;
    }
    if (!userId) {
      res.status(400).json({ error: 'x-user-id header is required' });
      return;
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    await this.audioService.streamListeningTask(userId, language, level, req, res, topic);
  }

  @Post('listening-answers')
  async submitListeningAnswers(
    @Body() body: SubmitListeningAnswersRequest,
    @Headers('x-user-id') userId: string,
  ) {
    const { taskId, answers } = body;
    if (!taskId || !Array.isArray(answers)) {
      throw new BadRequestException('taskId and answers array are required');
    }
    if (!userId) {
      throw new BadRequestException('x-user-id header is required');
    }
    return this.audioService.submitListeningAnswers(userId, taskId, answers);
  }

  @Get('admin/summary')
  async adminSummary(
    @Query('period') period: string,
    @Query('language') language: string,
    @Query('exact') exact: string,
    @Headers('x-internal-token') internalToken: string,
    @Headers('x-internal-service') internalService: string,
    @Headers('x-debug-mode') debugMode: string,
  ) {
    requireAudioInternalToken(internalToken, internalService);

    const p = (period === 'week' || period === 'month' || period === 'all') ? period : 'week';
    const isExact = exact === 'true';

    if (isExact && p !== 'week') {
      throw new BadRequestException('Exact mode is limited to period=week (max ~7 × userCount IDs)');
    }
    if (isExact && debugMode !== 'true') {
      throw new BadRequestException('Exact mode requires x-debug-mode: true header');
    }

    const summary = await this.audioService.getAdminSummary(p as 'week' | 'month' | 'all', language || undefined);

    if (isExact) {
      const fromDate = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      const lang = language || undefined;
      const dailyActiveUserIds = await this.audioService.adminActiveUserIds(fromDate, lang);
      return { ...summary, daily_active_user_ids: dailyActiveUserIds };
    }

    return summary;
  }
}
