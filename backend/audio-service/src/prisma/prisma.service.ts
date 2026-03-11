import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../src/generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super({ datasourceUrl: process.env.DATABASE_URL } as any);
  }

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
