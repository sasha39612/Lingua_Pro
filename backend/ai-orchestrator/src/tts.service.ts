import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { TtsResult } from './types';
import { withRetry, withTimeout } from './util';

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly openai: OpenAI | null;
  private readonly ttsModel: string;

  constructor() {
    const apiKey = process.env.AI_API_KEY;
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
    this.ttsModel = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async synthesize(text: string, language: string): Promise<TtsResult> {
    if (!this.openai || !text?.trim()) {
      return { audioBase64: null, mimeType: null, durationEstimateMs: null };
    }

    try {
      const audioBase64 = await withRetry(
        () =>
          withTimeout(
            this.generateAudio(text, language),
            20_000,
            'TTS request timed out',
          ),
        'synthesizeSpeech',
        this.logger,
        2,   // 2 attempts for TTS — it's non-critical
        400,
      );

      return {
        audioBase64,
        mimeType: 'audio/mpeg',
        durationEstimateMs: this.estimateDuration(text),
      };
    } catch (error: any) {
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
    return 'alloy'; // default for English and unknown languages
  }

  private estimateDuration(text: string): number {
    // Rough estimate: ~2.5 words per second of speech
    const wordCount = text.trim().split(/\s+/).length;
    return Math.round((wordCount / 2.5) * 1000);
  }
}
