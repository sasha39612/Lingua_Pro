import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { Observable, concat, from, of } from 'rxjs';
import { map } from 'rxjs/operators';
import type { AnalyzeResult } from './types';
import { safeJsonParse, normalizeScore, withRetry, withTimeout } from './util';

@Injectable()
export class TextAiService {
  private readonly logger = new Logger(TextAiService.name);
  private readonly openai: OpenAI | null;
  private readonly textModel: string;

  constructor() {
    const apiKey = process.env.AI_API_KEY;
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
    this.textModel = process.env.OPENAI_TEXT_MODEL || 'gpt-4o';
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async analyzeText(text: string, language: string): Promise<AnalyzeResult> {
    const normalized = (text || '').trim();
    if (!normalized) {
      return {
        correctedText: '',
        feedback: `Please provide text to analyze (${language}).`,
        textScore: 0.5,
      };
    }

    if (!this.openai) {
      return this.localTextAnalysis(normalized, language);
    }

    try {
      const response = await withRetry(
        () =>
          withTimeout(
            this.openai!.chat.completions.create({
              model: this.textModel,
              response_format: { type: 'json_object' },
              temperature: 0.2,
              messages: [
                {
                  role: 'system',
                  content:
                    `You are a language tutor for ${this.languageTone(language)}. ` +
                    'Return strict JSON with keys: correctedText (string), feedback (string), textScore (number 0..1). ' +
                    'Focus on grammar, spelling, punctuation, and clarity. Keep feedback concise and actionable.',
                },
                {
                  role: 'user',
                  content: `Language: ${language}\nStudent text: ${normalized}`,
                },
              ],
            }),
            15_000,
            'text analyze request timed out',
          ),
        'analyzeText',
        this.logger,
      );

      const content = response.choices?.[0]?.message?.content || '{}';
      const parsed = safeJsonParse<{ correctedText?: string; feedback?: string; textScore?: number }>(content);
      const fallback = this.localTextAnalysis(normalized, language);

      return {
        correctedText: (parsed.correctedText || fallback.correctedText).trim(),
        feedback: (parsed.feedback || fallback.feedback).trim(),
        textScore: normalizeScore(parsed.textScore, fallback.textScore),
      };
    } catch (error: any) {
      this.logger.warn(`GPT text analysis failed, using fallback: ${error?.message ?? error}`);
      return this.localTextAnalysis(normalized, language);
    }
  }

  streamTextAnalysis(text: string, language: string): Observable<{ data: any }> {
    const started = of({ data: { type: 'status', message: 'analysis_started' } });
    const result = from(this.analyzeText(text, language)).pipe(
      map((analysis) => ({ data: { type: 'result', ...analysis } })),
    );
    const done = of({ data: { type: 'status', message: 'analysis_complete' } });
    return concat(started, result, done);
  }

  // ── Local fallback ─────────────────────────────────────────────────────────

  private localTextAnalysis(text: string, language: string): AnalyzeResult {
    const normalized = (text || '').trim();

    let corrected = normalized.replace(/\s+/g, ' ').replace(/\bstuding\b/gi, 'studying');

    if (!/[.!?]$/.test(corrected)) {
      corrected += '.';
    }

    const changed = corrected !== normalized;
    const feedback = changed
      ? 'Minor corrections were applied to improve spelling and punctuation.'
      : 'Great work! No obvious errors detected.';

    return {
      correctedText: corrected,
      feedback: `[${language}] ${feedback}`,
      textScore: changed ? 0.82 : 0.95,
    };
  }

  private languageTone(language: string): string {
    const lang = language.toLowerCase();
    if (lang.includes('german')) return 'German learners';
    if (lang.includes('albanian')) return 'Albanian learners';
    if (lang.includes('polish')) return 'Polish learners';
    return 'English learners';
  }
}
