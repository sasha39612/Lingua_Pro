import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';

@Module({
  controllers: [HealthController, OrchestratorController],
  providers: [OrchestratorService],
})
export class AppModule {}
