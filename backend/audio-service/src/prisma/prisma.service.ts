import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../src/generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL is not set; Prisma connection skipped');
      return;
    }
    await this.$connect();
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {
      // No-op when there is no active Prisma connection.
    }
  }
}
