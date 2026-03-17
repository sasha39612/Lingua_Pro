import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import { SpeechService } from './speech.service';
import { TextAiService } from './text-ai.service';
import { TaskService } from './task.service';
import { PronunciationAiService } from './pronunciation-ai.service';
import { TtsService } from './tts.service';

@Module({
  controllers: [HealthController, OrchestratorController],
  providers: [
    OrchestratorService,
    SpeechService,
    TextAiService,
    TaskService,
    PronunciationAiService,
    TtsService,
  ],
})
export class AppModule {}
