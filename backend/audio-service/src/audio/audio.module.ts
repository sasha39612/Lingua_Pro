import { Module } from '@nestjs/common';
import { AudioController } from './audio.controller';
import { AudioService } from './audio.service';
import { AudioRepository } from './audio.repository';
import { PrismaService } from '../prisma/prisma.service';
import { AiOrchestratorModule } from '../ai-orchestrator/ai-orchestrator.module';

@Module({
  imports: [AiOrchestratorModule],
  controllers: [AudioController],
  providers: [AudioService, AudioRepository, PrismaService]
})
export class AudioModule {}
