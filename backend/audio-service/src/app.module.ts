import { Module } from '@nestjs/common';
import { AudioModule } from './audio/audio.module';
import { PrismaService } from './prisma/prisma.service';
import { HealthController } from './health/health.controller';

@Module({
  imports: [AudioModule],
  controllers: [HealthController],
  providers: [PrismaService]
})
export class AppModule {}
