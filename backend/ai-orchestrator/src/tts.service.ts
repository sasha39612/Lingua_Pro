import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { TtsResult } from './types';
import { withRetryTracked, withTimeout } from './util';
import { AiUsageService } from './usage/ai-usage.service';
import { classifyError } from './usage/error-type';

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly openai: OpenAI | null;
  private readonly ttsModel: string;

  constructor(private readonly aiUsage: AiUsageService) {
    const apiKey = process.env.AI_API_KEY;
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
    this.ttsModel = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async synthesize(text: string, language: string, requestId?: string): Promise<TtsResult> {
    if (!this.openai || !text?.trim()) {
      return { audioBase64: null, mimeType: null, durationEstimateMs: null };
    }

    const start = Date.now();
    let attempts = 0;

    try {
      // Listening passages are ~400 words — TTS can take 50-70s for long input.
      // Use Array.from() to count Unicode code points (not UTF-16 code units) —
      // JS .length double-counts emoji/surrogate pairs; providers bill by code point.
      const characters = Array.from(text).length;
      const ttsTimeout = characters > 500 ? 90_000 : 30_000;

      const { result: audioBase64, attempts: a } = await withRetryTracked(
        () =>
          withTimeout(
            this.generateAudio(text, language),
            ttsTimeout,
            'TTS request timed out',
          ),
        'synthesizeSpeech',
        this.logger,
        2,   // 2 attempts for TTS — it's non-critical
        400,
      );
      attempts = a;

      // TTS: no token counts from API — cost computed from character count instead
      void this.aiUsage.log({
        success: true,
        featureType: 'tts',
        endpoint: 'synthesize',
        model: this.ttsModel,
        durationMs: Date.now() - start,
        retryCount: attempts - 1,
        characters,
        requestId,
        language,
      });

      return {
        audioBase64,
        mimeType: 'audio/mpeg',
        durationEstimateMs: this.estimateDuration(text),
      };
    } catch (error: any) {
      void this.aiUsage.log({
        success: false,
        featureType: 'tts',
        endpoint: 'synthesize',
        model: this.ttsModel,
        errorType: classifyError(error).type,
        durationMs: Date.now() - start,
        retryCount: attempts > 0 ? attempts - 1 : 0,
        requestId,
        language,
      });
      this.logger.warn(`TTS generation failed, returning null: ${error?.message ?? error}`);
      return { audioBase64: null, mimeType: null, durationEstimateMs: null };
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async generateAudio(text: string, language: string): Promise<string> {
    const response = await this.openai!.audio.speech.create({
      model: this.ttsModel,
      voice: this.pickVoice(language),
      input: text,
      response_format: 'mp3',
    });

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  }

  private pickVoice(language: string): 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' {
    const lang = language.toLowerCase();
    if (lang.includes('german')) return 'echo';
    if (lang.includes('polish')) return 'fable';
    if (lang.includes('albanian')) return 'alloy';
    if (lang.includes('ukrainian')) return 'nova';
    return 'alloy'; // default for English and unknown languages
  }

  private estimateDuration(text: string): number {
    // Rough estimate: ~2.5 words per second of speech
    const wordCount = text.trim().split(/\s+/).length;
    return Math.round((wordCount / 2.5) * 1000);
  }
}
