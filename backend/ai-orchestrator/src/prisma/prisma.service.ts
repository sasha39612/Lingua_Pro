import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';

// The Prisma generated client is created by running `prisma generate` in this package.
// Until that happens (new DB, first deploy) the import resolves to undefined — all
// operations are skipped gracefully.  PrismaService must therefore NEVER be imported
// by modules that require it for correctness; only AiUsageService (fire-and-forget) uses it.

let PrismaClientCtor: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  PrismaClientCtor = require('../generated/prisma').PrismaClient;
} catch {
  // Generated client not available yet — will be created on first `prisma generate`
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private client: any = null;

  async onModuleInit() {
    if (!PrismaClientCtor) {
      this.logger.warn('[PrismaService] generated client not available — run prisma generate');
      return;
    }
    try {
      this.client = new PrismaClientCtor({
        datasources: { db: { url: process.env.DATABASE_URL } },
      });
      await this.client.$connect();
    } catch (err: any) {
      this.logger.warn(`[PrismaService] connect failed (non-fatal): ${err?.message ?? err}`);
      this.client = null;
    }
  }

  async onModuleDestroy() {
    try { await this.client?.$disconnect(); } catch { /* ignore */ }
  }

  get prismaClient(): any {
    return this.client;
  }
}
