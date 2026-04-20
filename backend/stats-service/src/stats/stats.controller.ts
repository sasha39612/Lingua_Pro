import { Controller, ForbiddenException, Get, Headers, Query } from '@nestjs/common';
import { GetStatsQueryDto } from './dto/get-stats-query.dto';
import { StatsService } from './stats.service';
import { AdminStatsService } from './admin-stats.service';

const STATS_INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET || '';
const STATS_ALLOWED_SERVICES = new Set(['api-gateway']);

@Controller()
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly adminStatsService: AdminStatsService,
  ) {}

  @Get('stats')
  getStats(@Query() query: GetStatsQueryDto) {
    return this.statsService.getStats(query.language.toUpperCase(), query.period, query.userId);
  }

  @Get('admin/stats')
  async getAdminStats(
    @Query('period') period: string,
    @Query('language') language: string,
    @Query('exact') exact: string,
    @Headers('x-internal-token') internalToken: string,
    @Headers('x-internal-service') internalService: string,
    @Headers('x-debug-mode') debugMode: string,
    @Headers('x-request-id') requestId: string,
  ) {
    if (!STATS_INTERNAL_SECRET || internalToken !== STATS_INTERNAL_SECRET ||
        !internalService || !STATS_ALLOWED_SERVICES.has(internalService)) {
      throw new ForbiddenException('Internal access only');
    }

    const p = (period === 'week' || period === 'month' || period === 'all') ? period : 'week';
    const isExact = exact === 'true';
    const isDebug = debugMode === 'true';

    return this.adminStatsService.getAdminStats(p, language || undefined, isExact, isDebug, requestId || undefined);
  }
}