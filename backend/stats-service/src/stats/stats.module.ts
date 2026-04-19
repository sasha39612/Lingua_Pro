import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { AdminStatsService } from './admin-stats.service';

@Module({
  controllers: [StatsController],
  providers: [StatsService, AdminStatsService],
})
export class StatsModule {}