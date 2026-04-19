import { Controller, Post, Body, Get, Query, Headers, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { TextService } from './text.service';

const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET || '';
const ALLOWED_INTERNAL_SERVICES = new Set(['stats-service', 'api-gateway']);

function requireInternalToken(headers: Record<string, string | undefined>): void {
  const token = headers['x-internal-token'];
  const service = headers['x-internal-service'];
  if (!INTERNAL_SERVICE_SECRET || token !== INTERNAL_SERVICE_SECRET || !service || !ALLOWED_INTERNAL_SERVICES.has(service)) {
    throw new ForbiddenException('Internal access only');
  }
}

@Controller('text')
export class TextController {
  private readonly logger = new Logger(TextController.name);
  constructor(private readonly textService: TextService) {}

  @Post('check')
  async check(
    @Body('userId') userId: string,
    @Body('language') language: string,
    @Body('text') text: string,
    @Body('skill') skill?: string,
  ) {
    if (!language) throw new BadRequestException('language is required');
    const uid = parseInt(userId, 10);
    return this.textService.analyzeText(uid, language, text, skill);
  }

  @Post('score')
  async score(
    @Body('userId') userId: string,
    @Body('language') language: string,
    @Body('skill') skill: string,
    @Body('score') score: number,
  ) {
    this.logger.log(`score: userId=${userId} language=${language} skill=${skill} score=${score}`);
    const uid = parseInt(userId, 10);
    return this.textService.recordScore(uid, language, skill, score);
  }

  @Get('tasks')
  async tasks(
    @Query('language') language: string,
    @Query('level') level: string,
    @Query('skill') skill?: string,
    @Headers('x-user-id') rawUserId?: string,
  ) {
    if (!language) throw new BadRequestException('language is required');
    if (!level) throw new BadRequestException('level is required');
    const userId = rawUserId ? parseInt(rawUserId, 10) : null;
    return this.textService.getTasks(language, level, skill, userId);
  }

  @Get('by-language')
  async byLanguage(
    @Query('language') language: string,
    @Query('from') from?: string,
    @Query('skill') skill?: string,
    @Query('userId') userId?: string,
  ) {
    if (!language) throw new BadRequestException('language is required');
    return this.textService.getTextsByLanguage(language, from, skill, userId);
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
    requireInternalToken({ 'x-internal-token': internalToken, 'x-internal-service': internalService });

    const p = (period === 'week' || period === 'month' || period === 'all') ? period : 'week';
    const isExact = exact === 'true';

    if (isExact && p !== 'week') {
      throw new BadRequestException('Exact mode is limited to period=week (max ~7 × userCount IDs)');
    }
    if (isExact && debugMode !== 'true') {
      throw new BadRequestException('Exact mode requires x-debug-mode: true header');
    }

    const summary = await this.textService.getAdminSummary(p as 'week' | 'month' | 'all', language || undefined);

    if (isExact) {
      const fromDate = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      const lang = language || undefined;
      const dailyActiveUserIds = await this.textService.adminActiveUserIds(fromDate, lang);
      return { ...summary, daily_active_user_ids: dailyActiveUserIds };
    }

    return summary;
  }
}
