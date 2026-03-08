import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [PrismaModule, StatsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}