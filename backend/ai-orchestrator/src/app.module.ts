import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import { SpeechService } from './speech.service';
import { TextAiService } from './text-ai.service';
import { TaskService } from './task.service';
import { PronunciationAiService } from './pronunciation-ai.service';
import { TtsService } from './tts.service';
import { G2pService } from './g2p.service';
import { PrismaService } from './prisma/prisma.service';
import { AiUsageService } from './usage/ai-usage.service';
import { UsageController } from './usage/usage.controller';

@Module({
  controllers: [HealthController, OrchestratorController, UsageController],
  providers: [
    PrismaService,
    AiUsageService,
    OrchestratorService,
    G2pService,
    SpeechService,
    TextAiService,
    TaskService,
    PronunciationAiService,
    TtsService,
  ],
})
export class AppModule {}
