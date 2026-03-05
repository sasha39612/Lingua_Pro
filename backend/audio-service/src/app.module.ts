import { Module } from '@nestjs/common';
import { AudioModule } from './audio/audio.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [AudioModule],
  providers: [PrismaService]
})
export class AppModule {}
