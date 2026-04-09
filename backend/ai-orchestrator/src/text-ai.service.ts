import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { Observable, concat, from, of } from 'rxjs';
import { map } from 'rxjs/operators';
import type { AnalyzeResult, WritingAnalysisResult, WritingTask } from './types';
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

  // ── Writing task analysis ──────────────────────────────────────────────────

  async analyzeWritingTask(text: string, language: string, taskContext: WritingTask): Promise<WritingAnalysisResult> {
    const normalized = (text || '').trim();

    if (!this.openai) {
      return this.localWritingAnalysis(normalized, language);
    }

    const taskSummary = [
      `Situation: ${taskContext.situation}`,
      `Task: ${taskContext.taskDescription}`,
      `Required points: ${taskContext.taskPoints.join('; ')}`,
      `Style: ${taskContext.style}`,
      `Word count: ${taskContext.wordCountMin}–${taskContext.wordCountMax}`,
    ].join('\n');

    try {
      const response = await withRetry(
        () =>
          withTimeout(
            this.openai!.chat.completions.create({
              model: this.textModel,
              response_format: { type: 'json_object' },
              temperature: 0.3,
              messages: [
                {
                  role: 'system',
                  content:
                    `You are a language examiner evaluating a ${language} writing task at CEFR level.\n` +
                    `IMPORTANT: Write ALL feedback text in ${language} — the same language as the task.\n` +
                    'Evaluate the student\'s text against the task and return strict JSON with exactly these keys:\n' +
                    '"taskAchievement": { "score": 0..1, "feedback": "1-2 sentences on whether all required points were addressed" }\n' +
                    '"grammarVocabulary": { "score": 0..1, "feedback": "1-2 sentences on grammar accuracy and vocabulary range" }\n' +
                    '"coherenceStructure": { "score": 0..1, "feedback": "1-2 sentences on paragraph organisation and flow" }\n' +
                    '"style": { "score": 0..1, "feedback": "1-2 sentences on whether the register matches the task requirement" }\n' +
                    '"correctedText": "the full corrected version of the student text with all errors fixed"\n' +
                    '"overallScore": average of the four scores as a single 0..1 number\n' +
                    '"overallFeedback": "2-3 sentence summary of strengths and main areas to improve"',
                },
                {
                  role: 'user',
                  content: `Task context:\n${taskSummary}\n\nStudent text:\n${normalized}`,
                },
              ],
            }),
            20_000,
            'writing analysis timed out',
          ),
        'analyzeWritingTask',
        this.logger,
      );

      const content = response.choices?.[0]?.message?.content || '{}';
      const parsed = safeJsonParse<Partial<WritingAnalysisResult>>(content);

      if (parsed.taskAchievement && parsed.grammarVocabulary && parsed.coherenceStructure && parsed.style) {
        const criterion = (c: any, fallback: number) => ({
          score: normalizeScore(c?.score, fallback),
          feedback: typeof c?.feedback === 'string' ? c.feedback.trim() : '',
        });
        const ta = criterion(parsed.taskAchievement, 0.7);
        const gv = criterion(parsed.grammarVocabulary, 0.7);
        const cs = criterion(parsed.coherenceStructure, 0.7);
        const st = criterion(parsed.style, 0.7);
        const overall = normalizeScore(parsed.overallScore, (ta.score + gv.score + cs.score + st.score) / 4);
        return {
          taskAchievement: ta,
          grammarVocabulary: gv,
          coherenceStructure: cs,
          style: st,
          correctedText: typeof parsed.correctedText === 'string' ? parsed.correctedText.trim() : normalized,
          overallScore: overall,
          overallFeedback: typeof parsed.overallFeedback === 'string' ? parsed.overallFeedback.trim() : '',
        };
      }

      this.logger.warn('GPT returned invalid writing analysis structure, using fallback');
    } catch (error: any) {
      this.logger.warn(`GPT writing analysis failed, using fallback: ${error?.message ?? error}`);
    }

    return this.localWritingAnalysis(normalized, language);
  }

  private localWritingAnalysis(text: string, language: string): WritingAnalysisResult {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const hasGreeting = /^(hi|dear|hello|hey)\b/i.test(text);
    const hasEnding = /(best wishes|take care|regards|sincerely|yours)/i.test(text);
    const taScore = wordCount >= 80 ? 0.75 : 0.55;
    const gvScore = 0.7;
    const csScore = hasGreeting && hasEnding ? 0.75 : 0.6;
    const stScore = 0.7;
    const overall = (taScore + gvScore + csScore + stScore) / 4;
    return {
      taskAchievement: { score: taScore, feedback: `[${language}] The text addresses the main points adequately.` },
      grammarVocabulary: { score: gvScore, feedback: `[${language}] Grammar and vocabulary are at an acceptable level.` },
      coherenceStructure: { score: csScore, feedback: `[${language}] The text ${hasGreeting && hasEnding ? 'has a clear structure.' : 'could benefit from clearer paragraph organisation.'}` },
      style: { score: stScore, feedback: `[${language}] The register is generally appropriate.` },
      correctedText: text,
      overallScore: overall,
      overallFeedback: `[${language}] Good effort. Focus on covering all task points and maintaining consistent style.`,
    };
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
