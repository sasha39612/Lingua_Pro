/// <reference types="node" />
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health/health.controller';
import { TextController } from './text/text.controller';
import { TextService } from './text/text.service';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [HttpModule],
  controllers: [HealthController, TextController],
  providers: [TextService, PrismaService]
})
export class AppModule {}
