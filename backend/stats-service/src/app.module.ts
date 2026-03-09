import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [StatsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}