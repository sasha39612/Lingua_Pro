import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PRICING_VERSION = process.env.PRICING_VERSION
  ?? new Date().toISOString().slice(0, 7); // default: "YYYY-MM"

// Unified rate type — supports token-based, character-based, and audio-second pricing.
// null = unknown/unmeasured pricing.
// Returns null (not 0) when unavailable — null in DB is honest; 0 corrupts totals.
type ModelRate =
  | { kind: 'tokens';       prompt: number; completion: number }
  | { kind: 'chars';        perChar: number }
  | { kind: 'audio_seconds'; perSecond: number }
  | null;

const MODEL_RATES: Record<string, ModelRate> = {
  'gpt-4o':          { kind: 'tokens',        prompt: 0.0000025,   completion: 0.000010 },
  'gpt-4o-mini':     { kind: 'tokens',        prompt: 0.00000015,  completion: 0.0000006 },
  'gpt-4o-mini-tts': { kind: 'chars',         perChar: 15.0 / 1_000_000 }, // $15/1M chars
  'whisper-1':       { kind: 'audio_seconds', perSecond: 0.006 / 60 },     // $0.006/min
  'azure-speech':    { kind: 'audio_seconds', perSecond: 0.01  / 60 },     // ~$0.01/min standard tier
};

function computeCost(
  model: string,
  opts: {
    prompt?: number | null;
    completion?: number | null;
    characters?: number | null;
    audioDurationSec?: number | null;
  },
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
  if (rate.kind === 'audio_seconds') {
    const { audioDurationSec } = opts;
    if (audioDurationSec == null || audioDurationSec <= 0) return null;
    return audioDurationSec * rate.perSecond;
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
  /** Audio duration in seconds — used for Azure Speech and Whisper cost calculation */
  audioDurationSec?: number | null;
  durationMs?: number;
  retryCount?: number;
  requestId?: string;
  userId?: number;
  language?: string;
  /** true when token counts are estimated (e.g. stream failed before the final usage chunk) */
  estimated?: boolean;
  /** method used for estimation — e.g. 'chars_div_4' — null when estimated=false */
  estimationMethod?: string | null;
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
        prompt:          event.promptTokens,
        completion:      event.completionTokens,
        characters:      event.characters,
        audioDurationSec: event.audioDurationSec,
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
          audioDurationSec: event.audioDurationSec ?? null,
          estimated:        event.estimated ?? false,
          estimationMethod: event.estimationMethod ?? null,
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
