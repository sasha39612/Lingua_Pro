import { Controller, ForbiddenException, Get, Headers, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_INTERNAL_SERVICES = new Set(['stats-service', 'api-gateway']);

@Controller('usage')
export class UsageController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get('admin')
  async getAdminUsage(
    @Query('period') period: string,
    @Headers('x-user-role') userRole: string,
    @Headers('x-internal-token') internalToken: string,
    @Headers('x-internal-service') internalService: string,
  ) {
    const isInternal = internalToken === (process.env.INTERNAL_SERVICE_SECRET || '')
      && ALLOWED_INTERNAL_SERVICES.has(internalService);
    if (!isInternal && userRole !== 'admin') {
      throw new ForbiddenException('Admin or internal access only');
    }

    const client = this.prismaService.prismaClient;
    if (!client) {
      return { period: period ?? 'week', rows: [], note: 'Prisma client not yet generated — run prisma generate' };
    }

    const fromDate = periodToDate(period ?? 'week');

    try {
      const rows = await client.$queryRaw`
        SELECT
          feature_type,
          endpoint,
          model,
          request_type,
          success,
          COUNT(*)::int AS event_count,
          SUM(prompt_tokens)::float AS total_prompt_tokens,
          SUM(completion_tokens)::float AS total_completion_tokens,
          SUM(total_tokens)::float AS total_tokens,
          AVG(duration_ms)::float AS avg_duration_ms,
          SUM(cost_usd)::float AS total_cost_usd,
          SUM(characters)::float AS total_characters,
          SUM(retry_count)::int AS total_retries,
          MAX(pricing_version) AS pricing_version
        FROM ai_usage_events
        WHERE created_at >= ${fromDate}
        GROUP BY feature_type, endpoint, model, request_type, success
        ORDER BY event_count DESC
      `;
      return { period: period ?? 'week', rows };
    } catch (err: any) {
      return { period: period ?? 'week', rows: [], error: err?.message };
    }
  }
}

function periodToDate(period: string): Date {
  const now = new Date();
  if (period === 'week')  return new Date(now.getTime() - 7  * 24 * 3600 * 1000);
  if (period === 'month') return new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  return new Date(0);
}
