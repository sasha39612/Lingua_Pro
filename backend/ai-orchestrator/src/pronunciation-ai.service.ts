import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { WordDetail, WordAlignment, PronunciationAnalysisResult } from './types';
import type { AzurePronunciationScores } from './speech.service';
import { safeJsonParse, withRetry, withTimeout, enrichPhonemeContext, phonemeHintsByLanguage } from './util';

export type PronunciationFeedback = {
  feedback: string;
  phonemeHints: string[];
};

type PhonemeSource = PronunciationAnalysisResult['phonemeSource'];

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
  // GPT behaviour is gated on phonemeSource:
  //   'acoustic' → full phoneme coaching (Azure data, real measurements)
  //   'g2p'      → word-level + G2P IPA diff hints (text-based, not acoustic)
  //   'none'     → word-level feedback only — NO phoneme advice, NO hallucination

  async generateFeedback(
    referenceText: string,
    transcript: string,
    language: string,
    azureScores: AzurePronunciationScores,
    words: WordDetail[],
    alignment: WordAlignment[],
    phonemeSource: PhonemeSource = 'none',
  ): Promise<PronunciationFeedback> {
    // ── Perfect result short-circuit ─────────────────────────────────────────
    // All words correct + no phoneme data → return a clean success message
    // without calling GPT (avoids hallucinated phoneme corrections).
    const allCorrect = alignment.length > 0 && alignment.every((e) => e.type === 'correct');
    if (allCorrect && phonemeSource === 'none') {
      return {
        feedback:
          'Excellent! All words were recognised correctly. ' +
          'Detailed phoneme-level analysis is not available for this language — ' +
          'focus on maintaining natural rhythm and fluency.',
        phonemeHints: [],
      };
    }

    if (!this.openai) {
      return this.localFeedback(azureScores.pronunciationScore, phonemeSource, language);
    }

    try {
      const wordContext = this.buildWordContext(words, alignment, phonemeSource);
      const prosodyLine = azureScores.prosodyScore != null
        ? `prosodyScore=${azureScores.prosodyScore.toFixed(2)} (rhythm, stress, intonation)`
        : null;

      // System prompt is gated by phonemeSource — prevents hallucinated phoneme advice.
      const systemPrompt = this.buildSystemPrompt(phonemeSource);

      const response = await withRetry(
        () =>
          withTimeout(
            this.openai!.chat.completions.create({
              model: this.evalModel,
              response_format: { type: 'json_object' },
              temperature: 0.3,
              messages: [
                { role: 'system', content: systemPrompt },
                {
                  role: 'user',
                  content: [
                    `Language: ${language}`,
                    `Reference text: "${referenceText}"`,
                    `Student said: "${transcript}"`,
                    `Scores: pronunciationScore=${azureScores.pronunciationScore.toFixed(2)}, ` +
                      `accuracyScore=${azureScores.accuracyScore.toFixed(2)}, ` +
                      `fluencyScore=${azureScores.fluencyScore.toFixed(2)}, ` +
                      `completenessScore=${azureScores.completenessScore.toFixed(2)}`,
                    prosodyLine,
                    wordContext ? `Error context:\n${wordContext}` : '',
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
      const parsed = safeJsonParse<{ feedback?: string; phonemeHints?: string[] }>(content);
      const hints = Array.isArray(parsed.phonemeHints) ? parsed.phonemeHints.slice(0, 4).map(String) : [];

      return {
        feedback: (parsed.feedback || '').trim() || this.localFeedback(azureScores.pronunciationScore, phonemeSource, language).feedback,
        // Only return phoneme hints when we have real data to back them up
        phonemeHints: phonemeSource !== 'none' ? hints : [],
      };
    } catch (error: any) {
      this.logger.warn(`GPT pronunciation feedback failed, using fallback: ${error?.message ?? error}`);
      return this.localFeedback(azureScores.pronunciationScore, phonemeSource, language);
    }
  }

  // ── System prompt — gated by phonemeSource ─────────────────────────────────

  private buildSystemPrompt(phonemeSource: PhonemeSource): string {
    const base =
      'You are a professional pronunciation coach for language learners.\n' +
      'Return strict JSON: { "feedback": string, "phonemeHints": string[] }.\n' +
      'Do NOT output any numeric scores.\n';

    if (phonemeSource === 'acoustic') {
      return (
        base +
        'You have real per-phoneme accuracy data from Azure Speech Assessment.\n' +
        'Your task:\n' +
        '1. Write a concise coaching paragraph (2–4 sentences) focused on the worst mistakes.\n' +
        '2. For each mistake mention the IPA phoneme and what the student should do physically (lips, tongue, airflow).\n' +
        '3. Use plain language for A1–B2 learners.\n' +
        '4. If prosody score is below 0.75, add one sentence about rhythm or intonation.\n' +
        '5. List up to 4 short actionable phoneme hints.'
      );
    }

    if (phonemeSource === 'g2p') {
      return (
        base +
        'You have word-level accuracy scores and text-based IPA hints (NOT acoustic measurements).\n' +
        'IMPORTANT: Do NOT claim to know exactly how the student pronounced individual phonemes.\n' +
        'Your task:\n' +
        '1. Comment on which words were incorrect and what the correct word was.\n' +
        '2. You may reference the expected IPA as a learning aid (e.g. "the word X is pronounced /xyz/").\n' +
        '3. Do NOT say a specific phoneme "was wrong" — you cannot know that from this data.\n' +
        '4. Focus on word choice, clarity, and rhythm.\n' +
        '5. phonemeHints should be general IPA pronunciation tips for the language, not specific to detected errors.'
      );
    }

    // phonemeSource === 'none'
    return (
      base +
      'You only have word-level correctness data — NO phoneme measurements exist for this result.\n' +
      'STRICT RULES:\n' +
      '- Do NOT mention specific sounds, IPA symbols, or letters as being wrong.\n' +
      '- Do NOT suggest articulation corrections (lips, tongue, airflow) for specific phonemes.\n' +
      '- Only comment on which words were wrong/missing and suggest the correct words.\n' +
      '- Give one general sentence about fluency or rhythm.\n' +
      '- phonemeHints must be an empty array [].'
    );
  }

  // ── Local fallback ─────────────────────────────────────────────────────────

  private localFeedback(score: number, phonemeSource: PhonemeSource, language = 'English'): PronunciationFeedback {
    if (phonemeSource === 'none') {
      return {
        feedback: score >= 0.95
          ? 'All words were recognised correctly. Focus on natural rhythm and fluency.'
          : 'Some words were not recognised. Try to speak clearly and check the reference text.',
        phonemeHints: [],
      };
    }

    return {
      feedback: score > 0.85
        ? 'Strong pronunciation overall. Focus on natural rhythm and sentence stress.'
        : 'Pronunciation differs from the reference in several places. Slow down and repeat key syllables.',
      phonemeHints: phonemeHintsByLanguage(language),
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private buildWordContext(words: WordDetail[], alignment: WordAlignment[], phonemeSource: PhonemeSource): string {
    // No phoneme data available — only supply word-level mismatch info.
    if (phonemeSource === 'none') {
      return alignment
        .filter((e) => e.type !== 'correct')
        .map((e) =>
          e.type === 'missing'
            ? `Missing word: "${e.expected}"`
            : e.type === 'extra'
            ? `Extra word spoken: "${e.spoken}"`
            : `Wrong word: said "${e.spoken}" instead of "${e.expected}"`,
        )
        .slice(0, 5)
        .join('\n');
    }

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
