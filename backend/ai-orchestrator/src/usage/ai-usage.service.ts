import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AiUsageEventInput {
  featureType: string;
  endpoint?: string;
  requestType?: string;
  model: string;
  success: boolean;
  errorType?: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  durationMs?: number;
  retryCount?: number;
  requestId?: string;
  userId?: number;
  language?: string;
}

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly prismaService: PrismaService) {}

  // Fire-and-forget — never throws, never blocks the response path.
  // Call sites must use: void this.aiUsageService.log({ ... });
  async log(event: AiUsageEventInput): Promise<void> {
    const client = this.prismaService.prismaClient;
    if (!client) return; // Prisma not yet available (pending generate/migration)
    try {
      await client.aiUsageEvent.create({
        data: {
          featureType:      event.featureType,
          endpoint:         event.endpoint,
          requestType:      event.requestType ?? 'sync',
          model:            event.model,
          success:          event.success,
          errorType:        event.errorType,
          promptTokens:     event.promptTokens ?? null,
          completionTokens: event.completionTokens ?? null,
          totalTokens:      event.totalTokens ?? null,
          durationMs:       event.durationMs,
          retryCount:       event.retryCount,
          requestId:        event.requestId,
          userId:           event.userId,
          language:         event.language,
        },
      });
    } catch (err: any) {
      this.logger.warn(`AI usage log failed (non-fatal): ${err?.message ?? err}`);
    }
  }
}
