import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { WordDetail } from './types';
import type { AzurePronunciationScores } from './speech.service';
import { safeJsonParse, withRetry, withTimeout, phonemeHintsByLanguage } from './util';

export type PronunciationFeedback = {
  feedback: string;
  phonemeHints: string[];
};

@Injectable()
export class PronunciationAiService {
  private readonly logger = new Logger(PronunciationAiService.name);
  private readonly openai: OpenAI | null;
  private readonly evalModel: string;

  constructor() {
    const apiKey = process.env.AI_API_KEY;
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
    this.evalModel = process.env.OPENAI_EVAL_MODEL || 'gpt-4o';
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  // GPT receives Azure scores + word detail as context.
  // Returns ONLY feedback string and phonemeHints — NEVER numeric scores.

  async generateFeedback(
    referenceText: string,
    transcript: string,
    language: string,
    azureScores: AzurePronunciationScores,
    words: WordDetail[],
  ): Promise<PronunciationFeedback> {
    if (!this.openai) {
      return this.localFeedback(azureScores.pronunciationScore, language);
    }

    try {
      const wordContext = this.buildWordContext(words);

      const response = await withRetry(
        () =>
          withTimeout(
            this.openai!.chat.completions.create({
              model: this.evalModel,
              response_format: { type: 'json_object' },
              temperature: 0.3,
              messages: [
                {
                  role: 'system',
                  content:
                    'You are a language pronunciation coach. ' +
                    'You receive Azure Speech Assessment scores and word-level phoneme data. ' +
                    'Write a concise, actionable feedback paragraph (2-4 sentences) and list up to 4 phoneme hints. ' +
                    'Return strict JSON: { "feedback": string, "phonemeHints": string[] }. ' +
                    'Do NOT produce any numeric scores.',
                },
                {
                  role: 'user',
                  content: [
                    `Language: ${language}`,
                    `Reference text: "${referenceText}"`,
                    `Student transcript: "${transcript}"`,
                    `Azure scores: pronunciationScore=${azureScores.pronunciationScore.toFixed(2)}, ` +
                      `accuracyScore=${azureScores.accuracyScore.toFixed(2)}, ` +
                      `fluencyScore=${azureScores.fluencyScore.toFixed(2)}, ` +
                      `completenessScore=${azureScores.completenessScore.toFixed(2)}`,
                    wordContext ? `Word detail (worst words):\n${wordContext}` : '',
                  ]
                    .filter(Boolean)
                    .join('\n'),
                },
              ],
            }),
            15_000,
            'pronunciation feedback request timed out',
          ),
        'generateFeedback',
        this.logger,
      );

      const content = response.choices?.[0]?.message?.content || '{}';
      // Structurally accept only feedback + phonemeHints — any score field GPT emits is ignored
      const parsed = safeJsonParse<{ feedback?: string; phonemeHints?: string[] }>(content);

      return {
        feedback: (parsed.feedback || '').trim() || this.localFeedback(azureScores.pronunciationScore, language).feedback,
        phonemeHints:
          Array.isArray(parsed.phonemeHints) && parsed.phonemeHints.length > 0
            ? parsed.phonemeHints.slice(0, 4).map(String)
            : phonemeHintsByLanguage(language),
      };
    } catch (error: any) {
      this.logger.warn(`GPT pronunciation feedback failed, using fallback: ${error?.message ?? error}`);
      return this.localFeedback(azureScores.pronunciationScore, language);
    }
  }

  // ── Local fallback ─────────────────────────────────────────────────────────

  private localFeedback(score: number, language: string): PronunciationFeedback {
    const feedback =
      score > 0.85
        ? 'Strong pronunciation overall. Focus on natural rhythm and sentence stress.'
        : 'Pronunciation differs from the reference in several words. Slow down and repeat key syllables.';

    return {
      feedback,
      phonemeHints: phonemeHintsByLanguage(language),
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private buildWordContext(words: WordDetail[]): string {
    const problematic = words
      .filter((w) => w.errorType !== 'None' || w.accuracyScore < 70)
      .slice(0, 10); // limit to 10 worst words to stay within context budget

    if (problematic.length === 0) return '';

    return problematic
      .map((w) => {
        const phonemeList = w.phonemes
          .filter((p) => p.accuracyScore < 70)
          .map((p) => `${p.phoneme}(${p.accuracyScore})`)
          .join(', ');
        return `"${w.word}": errorType=${w.errorType}, accuracy=${w.accuracyScore}${phonemeList ? `, phonemes=[${phonemeList}]` : ''}`;
      })
      .join('\n');
  }
}
