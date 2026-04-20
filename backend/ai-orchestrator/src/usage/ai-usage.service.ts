import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PRICING_VERSION = process.env.PRICING_VERSION
  ?? new Date().toISOString().slice(0, 7); // default: "YYYY-MM"

// $ per token. null = unknown pricing (TTS/Whisper/Azure — no per-token rate).
// Returns null (not 0) when unavailable — null in DB is honest; 0 corrupts totals.
const MODEL_RATES: Record<string, { prompt: number; completion: number } | null> = {
  'gpt-4o':          { prompt: 0.0000025,  completion: 0.000010 },
  'gpt-4o-mini':     { prompt: 0.00000015, completion: 0.0000006 },
  'gpt-4o-mini-tts': null, // flat-rate audio — no per-token pricing
  'whisper-1':       null, // per-second pricing — not token-based
  'azure-speech':    null, // per-minute pricing — not token-based
};

function computeCost(model: string, prompt?: number | null, completion?: number | null): number | null {
  const rate = MODEL_RATES[model];
  if (!rate || prompt == null || completion == null) return null;
  return prompt * rate.prompt + completion * rate.completion;
}

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
      const costUsd = computeCost(event.model, event.promptTokens, event.completionTokens);
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
          costUsd,
          pricingVersion:   costUsd != null ? PRICING_VERSION : null,
        },
      });
    } catch (err: any) {
      this.logger.warn(`AI usage log failed (non-fatal): ${err?.message ?? err}`);
    }
  }
}
