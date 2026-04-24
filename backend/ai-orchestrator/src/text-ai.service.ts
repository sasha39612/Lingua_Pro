import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { Observable, concat, from, of } from 'rxjs';
import { map } from 'rxjs/operators';
import type { AnalyzeResult, WritingAnalysisResult, WritingTask } from './types';
import { safeJsonParse, normalizeScore, withRetryTracked, withTimeout } from './util';
import { AiUsageService } from './usage/ai-usage.service';
import { classifyError } from './usage/error-type';

// ── Writing stream event types ─────────────────────────────────────────────────
export type WritingStreamEvent =
  | { event: 'analysis_started' }
  | { event: 'criterion'; data: { key: string; score: number; feedback: string } }
  | { event: 'analysis_complete'; data: { overallScore: number; overallFeedback: string; correctedText: string; partial?: boolean } }
  | { event: 'error' };

const VALID_CRITERION_KEYS = ['taskAchievement', 'grammarVocabulary', 'coherenceStructure', 'style'] as const;
type CriterionKey = typeof VALID_CRITERION_KEYS[number];

/** Parse a block of text that starts at a [CRITERION] marker. */
function parseCriterionBlock(block: string): { key: CriterionKey; score: number; feedback: string } | null {
  const headerMatch = block.match(/^\[CRITERION\]\s+(\w+)/m);
  if (!headerMatch) return null;

  const key = headerMatch[1] as CriterionKey;
  if (!VALID_CRITERION_KEYS.includes(key)) {
    return null; // unknown key — skip silently
  }

  const scoreMatch = block.match(/^Score:\s*([\d.]+)/m);
  const score = scoreMatch ? parseFloat(scoreMatch[1]) : NaN;
  if (!Number.isFinite(score)) return null;

  // Normalize: GPT may output 0-10 or 0-1 depending on prompt compliance
  const normalizedScore = score > 1 ? score / 10 : score;
  if (normalizedScore < 0 || normalizedScore > 1) return null;

  const feedbackMatch = block.match(/^Feedback:\s*(.+?)(?=\n\[|\[FINAL\]|$)/ms);
  const feedback = feedbackMatch ? feedbackMatch[1].replace(/\n/g, ' ').trim() : '';

  return { key, score: Math.round(normalizedScore * 100) / 100, feedback };
}

/** Parse the [FINAL] block. */
function parseFinalBlock(block: string): { overallScore: number; overallFeedback: string; correctedText: string } | null {
  const scoreMatch = block.match(/^OverallScore:\s*([\d.]+)/m);
  const overallScore = scoreMatch ? parseFloat(scoreMatch[1]) : NaN;
  if (!Number.isFinite(overallScore)) return null;

  const normalizedScore = overallScore > 1 ? overallScore / 10 : overallScore;

  const feedbackMatch = block.match(/^OverallFeedback:\s*(.+?)(?=\nCorrectedText:|$)/ms);
  const overallFeedback = feedbackMatch ? feedbackMatch[1].replace(/\n/g, ' ').trim() : '';

  const correctedMatch = block.match(/^CorrectedText:\s*([\s\S]+)/m);
  const correctedText = correctedMatch ? correctedMatch[1].trim() : '';

  return { overallScore: Math.round(normalizedScore * 100) / 100, overallFeedback, correctedText };
}

@Injectable()
export class TextAiService {
  private readonly logger = new Logger(TextAiService.name);
  private readonly openai: OpenAI | null;
  private readonly textModel: string;

  constructor(private readonly aiUsage: AiUsageService) {
    const apiKey = process.env.AI_API_KEY;
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
    this.textModel = process.env.OPENAI_TEXT_MODEL || 'gpt-4o';
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async analyzeText(text: string, language: string, requestId?: string): Promise<AnalyzeResult> {
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

    const start = Date.now();
    let attempts = 0;
    try {
      const { result: response, attempts: a } = await withRetryTracked(
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
      attempts = a;

      void this.aiUsage.log({
        featureType: 'text_analyze',
        endpoint: 'analyzeText',
        model: this.textModel,
        success: true,
        durationMs: Date.now() - start,
        retryCount: attempts - 1,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        requestId,
        language,
      });

      const content = response.choices?.[0]?.message?.content || '{}';
      const parsed = safeJsonParse<{ correctedText?: string; feedback?: string; textScore?: number }>(content);
      const fallback = this.localTextAnalysis(normalized, language);

      return {
        correctedText: (parsed.correctedText || fallback.correctedText).trim(),
        feedback: (parsed.feedback || fallback.feedback).trim(),
        textScore: normalizeScore(parsed.textScore, fallback.textScore),
      };
    } catch (error: any) {
      void this.aiUsage.log({
        featureType: 'text_analyze',
        endpoint: 'analyzeText',
        model: this.textModel,
        success: false,
        errorType: classifyError(error).type,
        durationMs: Date.now() - start,
        retryCount: attempts > 0 ? attempts - 1 : 0,
        requestId,
        language,
      });
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

  async analyzeWritingTask(text: string, language: string, taskContext: WritingTask, requestId?: string): Promise<WritingAnalysisResult> {
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

    const start = Date.now();
    let attempts = 0;
    try {
      const { result: response, attempts: a } = await withRetryTracked(
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
      attempts = a;

      void this.aiUsage.log({
        featureType: 'writing_analyze',
        endpoint: 'analyzeWritingTask',
        model: this.textModel,
        success: true,
        durationMs: Date.now() - start,
        retryCount: attempts - 1,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        requestId,
        language,
      });

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
      void this.aiUsage.log({
        featureType: 'writing_analyze',
        endpoint: 'analyzeWritingTask',
        model: this.textModel,
        success: false,
        errorType: 'parse_error',
        durationMs: Date.now() - start,
        retryCount: attempts - 1,
        requestId,
        language,
      });
    } catch (error: any) {
      void this.aiUsage.log({
        featureType: 'writing_analyze',
        endpoint: 'analyzeWritingTask',
        model: this.textModel,
        success: false,
        errorType: classifyError(error).type,
        durationMs: Date.now() - start,
        retryCount: attempts > 0 ? attempts - 1 : 0,
        requestId,
        language,
      });
      this.logger.warn(`GPT writing analysis failed, using fallback: ${error?.message ?? error}`);
    }

    return this.localWritingAnalysis(normalized, language);
  }

  // ── Writing task streaming (marker-based protocol) ────────────────────────

  async *streamWritingAnalysis(
    text: string,
    language: string,
    taskContext: WritingTask,
    requestId?: string,
  ): AsyncGenerator<WritingStreamEvent> {
    yield { event: 'analysis_started' };

    const normalized = (text || '').trim();

    if (!this.openai) {
      yield* this.streamLocalFallback(normalized, language);
      return;
    }

    const taskSummary = [
      `Situation: ${taskContext.situation}`,
      `Task: ${taskContext.taskDescription}`,
      `Required points: ${taskContext.taskPoints.join('; ')}`,
      `Style: ${taskContext.style}`,
      `Word count: ${taskContext.wordCountMin}–${taskContext.wordCountMax}`,
    ].join('\n');

    const start = Date.now();
    let accumulatedChars = 0;
    let promptTokens: number | undefined;
    const emittedCriteria = new Map<CriterionKey, { score: number; feedback: string }>();
    let finalEmitted = false;

    // ── [FINAL] timeout guard ──────────────────────────────────────────────
    // If [FINAL] has not arrived within 45 s, break the loop and emit partial result.
    // Using a boolean flag instead of Promise.race because yield cannot cross function
    // boundaries (it must live directly in the async generator body).
    const STREAM_TIMEOUT_MS = 45_000;
    let timedOut = false;
    const timeoutHandle = setTimeout(() => { timedOut = true; }, STREAM_TIMEOUT_MS);

    try {
      const stream = await this.openai!.chat.completions.create({
        model: this.textModel,
        stream: true,
        stream_options: { include_usage: true },
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              `You are a language examiner evaluating a ${language} writing task at CEFR level.\n` +
              `Write ALL feedback text in ${language}.\n` +
              'Respond in EXACTLY this format — do not deviate:\n\n' +
              '[CRITERION] taskAchievement\n' +
              'Score: <0.0-1.0>\n' +
              'Feedback: <one sentence>\n\n' +
              '[CRITERION] grammarVocabulary\n' +
              'Score: <0.0-1.0>\n' +
              'Feedback: <one sentence>\n\n' +
              '[CRITERION] coherenceStructure\n' +
              'Score: <0.0-1.0>\n' +
              'Feedback: <one sentence>\n\n' +
              '[CRITERION] style\n' +
              'Score: <0.0-1.0>\n' +
              'Feedback: <one sentence>\n\n' +
              '[FINAL]\n' +
              'OverallScore: <0.0-1.0>\n' +
              'OverallFeedback: <two sentences>\n' +
              'CorrectedText: <full corrected student text>',
          },
          {
            role: 'user',
            content: `Task context:\n${taskSummary}\n\nStudent text:\n${normalized}`,
          },
        ],
      });

      let buffer = '';

      for await (const chunk of stream) {
        if (timedOut) {
          this.logger.warn(`streamWritingAnalysis: [FINAL] not received within ${STREAM_TIMEOUT_MS}ms, emitting partial result`);
          break;
        }

        const delta = chunk.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          buffer += delta;
          accumulatedChars += delta.length;
        }

        // Collect usage from the final chunk
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens;
        }

        // ── Incremental marker detection ─────────────────────────────────
        // Split on [CRITERION] or [FINAL] to find complete blocks
        const markerRe = /(?=\[CRITERION\]|\[FINAL\])/g;
        const parts = buffer.split(markerRe);

        // The last part may be incomplete — keep it in the buffer
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          if (part.startsWith('[CRITERION]')) {
            const parsed = parseCriterionBlock(part);
            if (parsed && !emittedCriteria.has(parsed.key)) {
              emittedCriteria.set(parsed.key, { score: parsed.score, feedback: parsed.feedback });
              yield { event: 'criterion', data: parsed };
            } else if (!parsed) {
              this.logger.warn(`streamWritingAnalysis: invalid criterion block skipped: ${part.slice(0, 80)}`);
            }
          } else if (part.startsWith('[FINAL]')) {
            const parsed = parseFinalBlock(part);
            if (parsed) {
              finalEmitted = true;
              yield { event: 'analysis_complete', data: parsed };
            }
          }
        }
      }

      // Flush remaining buffer (stream ended without timeout)
      if (buffer.trim() && !timedOut) {
        if (buffer.includes('[FINAL]')) {
          const parsed = parseFinalBlock(buffer);
          if (parsed && !finalEmitted) {
            finalEmitted = true;
            yield { event: 'analysis_complete', data: parsed };
          }
        } else if (buffer.startsWith('[CRITERION]')) {
          const parsed = parseCriterionBlock(buffer + '\n\n');
          if (parsed && !emittedCriteria.has(parsed.key)) {
            emittedCriteria.set(parsed.key, { score: parsed.score, feedback: parsed.feedback });
            yield { event: 'criterion', data: parsed };
          }
        }
      }
    } catch (error: any) {
      const classifiedError = classifyError(error);
      void this.aiUsage.log({
        featureType: 'writing_analyze_stream',
        endpoint: 'streamWritingAnalysis',
        model: this.textModel,
        success: false,
        errorType: classifiedError.type,
        durationMs: Date.now() - start,
        retryCount: 0,
        // Estimate tokens from accumulated text on mid-stream failure
        promptTokens: promptTokens ?? Math.ceil(taskSummary.length / 4),
        completionTokens: Math.ceil(accumulatedChars / 4),
        estimated: !promptTokens,
        estimationMethod: !promptTokens ? 'chars_div_4' : undefined,
        requestId,
        language,
      });
      this.logger.warn(`streamWritingAnalysis failed: ${error?.message ?? error}`);
      yield { event: 'error' };
      yield* this.streamLocalFallback(normalized, language);
      return;
    } finally {
      clearTimeout(timeoutHandle);
    }

    // If [FINAL] was never emitted (timeout or incomplete stream), emit partial result
    if (!finalEmitted) {
      const scores = [...emittedCriteria.values()].map((c) => c.score);
      const overallScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.7;
      yield {
        event: 'analysis_complete',
        data: { overallScore: Math.round(overallScore * 100) / 100, overallFeedback: '', correctedText: normalized, partial: true },
      };
    }

    void this.aiUsage.log({
      featureType: 'writing_analyze_stream',
      endpoint: 'streamWritingAnalysis',
      model: this.textModel,
      success: true,
      durationMs: Date.now() - start,
      retryCount: 0,
      promptTokens,
      completionTokens: Math.ceil(accumulatedChars / 4),
      estimated: !promptTokens,
      estimationMethod: !promptTokens ? 'chars_div_4' : undefined,
      requestId,
      language,
    });
  }

  private async *streamLocalFallback(text: string, language: string): AsyncGenerator<WritingStreamEvent> {
    const fallback = this.localWritingAnalysis(text, language);
    yield { event: 'criterion', data: { key: 'taskAchievement', ...fallback.taskAchievement } };
    yield { event: 'criterion', data: { key: 'grammarVocabulary', ...fallback.grammarVocabulary } };
    yield { event: 'criterion', data: { key: 'coherenceStructure', ...fallback.coherenceStructure } };
    yield { event: 'criterion', data: { key: 'style', ...fallback.style } };
    yield { event: 'analysis_complete', data: { overallScore: fallback.overallScore, overallFeedback: fallback.overallFeedback, correctedText: fallback.correctedText } };
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
