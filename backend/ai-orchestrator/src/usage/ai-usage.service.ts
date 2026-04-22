import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PRICING_VERSION = process.env.PRICING_VERSION
  ?? new Date().toISOString().slice(0, 7); // default: "YYYY-MM"

// Unified rate type — supports both token-based and character-based pricing.
// null = unknown/unmeasured pricing (whisper-1, azure-speech — per-second/per-minute).
// Returns null (not 0) when unavailable — null in DB is honest; 0 corrupts totals.
type ModelRate =
  | { kind: 'tokens'; prompt: number; completion: number }
  | { kind: 'chars';  perChar: number }
  | null;

const MODEL_RATES: Record<string, ModelRate> = {
  'gpt-4o':          { kind: 'tokens', prompt: 0.0000025,  completion: 0.000010 },
  'gpt-4o-mini':     { kind: 'tokens', prompt: 0.00000015, completion: 0.0000006 },
  'gpt-4o-mini-tts': { kind: 'chars',  perChar: 15.0 / 1_000_000 }, // $15/1M chars
  'whisper-1':       null, // per-second pricing — not token or char based
  'azure-speech':    null, // per-minute pricing — not token or char based
};

function computeCost(
  model: string,
  opts: { prompt?: number | null; completion?: number | null; characters?: number | null },
): number | null {
  const rate = MODEL_RATES[model];
  if (!rate) return null;
  if (rate.kind === 'tokens') {
    const { prompt, completion } = opts;
    if (prompt == null || prompt < 0 || completion == null || completion < 0) return null;
    return prompt * rate.prompt + completion * rate.completion;
  }
  if (rate.kind === 'chars') {
    const { characters } = opts;
    if (characters == null || characters <= 0) return null;
    return characters * rate.perChar;
  }
  return null;
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
  characters?: number | null;
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
    if (!client) {
      this.logger.warn('[AiUsageService] prismaClient is null — skipping log (feature: ' + event.featureType + ')');
      return;
    }
    try {
      const costUsd = computeCost(event.model, {
        prompt:     event.promptTokens,
        completion: event.completionTokens,
        characters: event.characters,
      });
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
          characters:       event.characters ?? null,
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
