import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool } from 'pg';

// The Prisma generated client is created by running `prisma generate` in this package.
// Until that happens (new DB, first deploy) the import resolves to undefined — all
// operations are skipped gracefully.  PrismaService must therefore NEVER be imported
// by modules that require it for correctness; only AiUsageService (fire-and-forget) uses it.

let PrismaClientCtor: any;
let PrismaPgCtor: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  PrismaClientCtor = require('../generated/prisma').PrismaClient;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  PrismaPgCtor = require('@prisma/adapter-pg').PrismaPg;
} catch {
  // Generated client or adapter not available yet
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private client: any = null;
  private pool: Pool | null = null;

  async onModuleInit() {
    if (!PrismaClientCtor || !PrismaPgCtor) {
      this.logger.warn('[PrismaService] generated client or adapter not available — run prisma generate');
      return;
    }
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      this.logger.warn('[PrismaService] DATABASE_URL not set — skipping connection');
      return;
    }
    try {
      this.pool = new Pool({ connectionString: databaseUrl });
      const adapter = new PrismaPgCtor(this.pool);
      this.client = new PrismaClientCtor({ adapter });
      await this.client.$connect();
    } catch (err: any) {
      this.logger.warn(`[PrismaService] connect failed (non-fatal): ${err?.message ?? err}`);
      this.client = null;
      await this.pool?.end().catch(() => {});
      this.pool = null;
    }
  }

  async onModuleDestroy() {
    try { await this.client?.$disconnect(); } catch { /* ignore */ }
    try { await this.pool?.end(); } catch { /* ignore */ }
  }

  get prismaClient(): any {
    return this.client;
  }
}
