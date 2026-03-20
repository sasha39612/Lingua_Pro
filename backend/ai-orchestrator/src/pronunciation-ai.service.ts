import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { WordDetail, WordAlignment } from './types';
import type { AzurePronunciationScores } from './speech.service';
import { safeJsonParse, withRetry, withTimeout, phonemeHintsByLanguage, enrichPhonemeContext } from './util';

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
    alignment: WordAlignment[],
  ): Promise<PronunciationFeedback> {
    if (!this.openai) {
      return this.localFeedback(azureScores.pronunciationScore, language);
    }

    try {
      const wordContext = this.buildWordContext(words, alignment);
      const prosodyLine = azureScores.prosodyScore != null
        ? `prosodyScore=${azureScores.prosodyScore.toFixed(2)} (rhythm, stress, intonation)`
        : null;

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
                    'You are a professional pronunciation coach for language learners.\n' +
                    'You receive Azure Speech Assessment data including per-phoneme accuracy with IPA symbols and articulation guidance.\n' +
                    'Your task:\n' +
                    '1. Write a concise coaching paragraph (2–4 sentences) focused on the worst mistakes.\n' +
                    '2. For each mistake mention the IPA phoneme, what the student should do physically (lips, tongue, airflow).\n' +
                    '3. Use plain language appropriate for A1–B2 learners — no jargon.\n' +
                    '4. If prosody data is provided and the score is below 0.75, add one sentence about rhythm or intonation.\n' +
                    '5. List up to 4 short phoneme hints (one actionable tip each).\n' +
                    'Return strict JSON: { "feedback": string, "phonemeHints": string[] }.\n' +
                    'Do NOT output any numeric scores.',
                },
                {
                  role: 'user',
                  content: [
                    `Language: ${language}`,
                    `Reference text: "${referenceText}"`,
                    `Student said: "${transcript}"`,
                    `Azure scores: pronunciationScore=${azureScores.pronunciationScore.toFixed(2)}, ` +
                      `accuracyScore=${azureScores.accuracyScore.toFixed(2)}, ` +
                      `fluencyScore=${azureScores.fluencyScore.toFixed(2)}, ` +
                      `completenessScore=${azureScores.completenessScore.toFixed(2)}`,
                    prosodyLine,
                    wordContext ? `Worst phonemes (IPA + articulation):\n${wordContext}` : '',
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

  private buildWordContext(words: WordDetail[], alignment: WordAlignment[]): string {
    const lines: string[] = [];

    // ── Azure acoustic phonemes (source === 'acoustic') ───────────────────────
    type PhonemeEntry = { word: string; phoneme: string; score: number; errorType: WordDetail['errorType'] };
    const acousticEntries: PhonemeEntry[] = [];
    for (const w of words) {
      if (w.errorType === 'None' && w.accuracyScore >= 70) continue;
      for (const p of w.phonemes) {
        if (p.accuracyScore < 70) {
          acousticEntries.push({ word: w.word, phoneme: p.phoneme, score: Math.round(p.accuracyScore), errorType: w.errorType });
        }
      }
    }
    const worstAcoustic = acousticEntries.sort((a, b) => a.score - b.score).slice(0, 5);
    for (const e of worstAcoustic) {
      lines.push(`In "${e.word}" (${e.errorType}): ${enrichPhonemeContext(e.phoneme, e.score)}`);
    }

    // ── G2P text-based hints (source === 'g2p') ───────────────────────────────
    // Only included when acoustic phonemes are absent (fallback path).
    if (worstAcoustic.length === 0) {
      for (const entry of alignment) {
        if (!entry.g2pHints || entry.g2pHints.errorPhonemes.length === 0) continue;
        const expectedStr = entry.g2pHints.expectedIpa.join(' ');
        const spokenStr   = entry.g2pHints.spokenIpa.join(' ') || '(unclear)';
        const hints = entry.g2pHints.errorPhonemes.slice(0, 3)
          .map((p) => enrichPhonemeContext(p, 0))
          .join('; ');
        lines.push(
          `"${entry.expected}" → you said "${entry.spoken ?? '?'}": ` +
          `expected /${expectedStr}/, heard /${spokenStr}/. ` +
          `Missing phonemes: ${hints} [source: G2P text-based, not acoustic]`,
        );
        if (lines.length >= 5) break;
      }
    }

    return lines.join('\n');
  }
}
