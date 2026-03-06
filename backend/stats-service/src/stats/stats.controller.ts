import { Controller, Get, Query } from '@nestjs/common';
import { GetStatsQueryDto } from './dto/get-stats-query.dto';
import { StatsService } from './stats.service';

@Controller()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('stats')
  getStats(@Query() query: GetStatsQueryDto) {
    return this.statsService.getStats(query.language.toUpperCase(), query.period);
  }
}