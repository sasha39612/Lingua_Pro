'use client';

import { useCallback, useState } from 'react';
import { LabFrame } from '@/components/lab-frame';
import { SelectDropdown } from '@/components/select-dropdown';
import { useAppStore } from '@/store/app-store';
import { useAiStream } from '@/lib/use-ai-stream';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

type ReadingQuestionType = 'multiple_choice' | 'true_false_ng' | 'matching' | 'vocabulary' | 'main_idea';

interface ReadingQuestion {
  type: ReadingQuestionType;
  question?: string;
  options?: string[];
  correctAnswer?: string;       // 'A'|'B'|'C'|'D' for MC/vocab/main_idea; 'T'|'F'|'NG' for tf_ng
  matchingIdea?: string;
  matchingOptions?: string[];
  correctMatchIndex?: number;
}

interface ReadingTask {
  taskId: number;
  passage: string;
  questions: ReadingQuestion[];
}

interface QuestionResult {
  index: number;
  correct: boolean;
}

interface AnswersResult {
  score: number;
  correct: number;
  total: number;
  results: QuestionResult[];
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

const SECTION_LABEL_KEYS: Record<ReadingQuestionType, string> = {
  multiple_choice: 'multipleChoice',
  true_false_ng: 'trueFalseNg',
  matching: 'matching',
  vocabulary: 'vocabulary',
  main_idea: 'mainIdea',
};

const SECTION_ORDER: ReadingQuestionType[] = [
  'multiple_choice',
  'true_false_ng',
  'matching',
  'vocabulary',
  'main_idea',
];

// ── Highlight helpers ────────────────────────────────────────────────────────

const HIGHLIGHT_COLORS = [
  { bg: 'bg-yellow-200',  badge: 'bg-yellow-500'  },
  { bg: 'bg-sky-200',     badge: 'bg-sky-500'      },
  { bg: 'bg-violet-200',  badge: 'bg-violet-500'   },
  { bg: 'bg-rose-200',    badge: 'bg-rose-500'     },
  { bg: 'bg-emerald-200', badge: 'bg-emerald-500'  },
] as const;

function getCorrectAnswerText(q: ReadingQuestion): string | null {
  if (q.type === 'multiple_choice' || q.type === 'vocabulary' || q.type === 'main_idea') {
    if (!q.correctAnswer || !q.options) return null;
    const idx = OPTION_LABELS.indexOf(q.correctAnswer as typeof OPTION_LABELS[number]);
    return idx >= 0 ? (q.options[idx] ?? null) : null;
  }
  if (q.type === 'true_false_ng') return q.question ?? null;
  if (q.type === 'matching') return q.matchingIdea ?? null;
  return null;
}

interface HighlightSpec {
  text: string;
  colorIndex: number;
  questionNumber: number;
}

interface TextSegment {
  text: string;
  highlights: Array<{ colorIndex: number; questionNumber: number }>;
}

function buildHighlightedSegments(passage: string, specs: HighlightSpec[]): TextSegment[] {
  if (specs.length === 0) return [{ text: passage, highlights: [] }];

  interface Range { start: number; end: number; colorIndex: number; questionNumber: number }
  const ranges: Range[] = [];

  for (const spec of specs) {
    if (!spec.text.trim()) continue;
    const lower = passage.toLowerCase();
    const target = spec.text.toLowerCase().trim();
    let pos = 0;
    while (pos < lower.length) {
      const idx = lower.indexOf(target, pos);
      if (idx === -1) break;
      ranges.push({ start: idx, end: idx + target.length, colorIndex: spec.colorIndex, questionNumber: spec.questionNumber });
      pos = idx + target.length;
    }
  }

  if (ranges.length === 0) return [{ text: passage, highlights: [] }];

  const boundaries = new Set<number>([0, passage.length]);
  for (const r of ranges) { boundaries.add(r.start); boundaries.add(r.end); }
  const sorted = Array.from(boundaries).sort((a, b) => a - b);

  const segments: TextSegment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    segments.push({
      text: passage.slice(start, end),
      highlights: ranges
        .filter((r) => r.start <= start && r.end >= end)
        .map(({ colorIndex, questionNumber }) => ({ colorIndex, questionNumber })),
    });
  }
  return segments;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ReadingPage() {
  const t = useTranslations('reading');
  const language = useAppStore((s) => s.language);
  const level = useAppStore((s) => s.level);
  const user = useAppStore((s) => s.user);

  const [task, setTask] = useState<ReadingTask | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<AnswersResult | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [activeHighlights, setActiveHighlights] = useState<Set<number>>(new Set());

  // ── SSE event types ──────────────────────────────────────────────────────
  type ReadingStreamEvent =
    | { event: 'task_generating'; requestId?: string }
    | { event: 'task_ready'; data: ReadingTask[]; requestId?: string }
    | { event: 'error'; data?: { message?: string }; requestId?: string };

  const readingStream = useAiStream<ReadingStreamEvent>({
    url: '/api/reading/task/stream',
    method: 'POST',
    onEvent: useCallback((ev: ReadingStreamEvent) => {
      if (ev.event === 'task_ready') {
        const raw = ev.data[0];
        if (!raw) { setTaskError(t('noTask')); return; }
        const questions = Array.isArray(raw.questions)
          ? raw.questions
          : typeof raw.questions === 'string'
            ? JSON.parse(raw.questions as unknown as string)
            : [];
        setTask({ taskId: (raw as any).id ?? (raw as any).taskId, passage: (raw as any).referenceText ?? (raw as any).passage ?? '', questions });
      } else if (ev.event === 'error') {
        setTaskError(ev.data?.message ?? t('failedToLoad'));
      }
    }, [t]),
    onError: useCallback(() => {
      setTaskError(t('connectionError'));
    }, [t]),
  });

  const loadingTask = readingStream.status === 'streaming';

  const fetchTask = useCallback(() => {
    if (!user) {
      setTaskError(t('authError'));
      return;
    }
    readingStream.cancel();
    setTaskError(null);
    setTask(null);
    setAnswers({});
    setResult(null);
    setActiveHighlights(new Set());
    readingStream.start({ language, level, userId: user.id });
  }, [language, level, user, readingStream, t]);

  const setAnswer = (index: number, value: string) => {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const toggleHighlight = (index: number) => {
    setActiveHighlights((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const allAnswered =
    task !== null &&
    task.questions.length > 0 &&
    task.questions.every((_, idx) => answers[idx] !== undefined && answers[idx] !== '');

  const handleSubmit = () => {
    if (!task || !allAnswered) return;

    const results: QuestionResult[] = task.questions.map((q, idx) => {
      const given = answers[idx];
      let correct = false;
      if (q.type === 'matching') {
        correct = parseInt(given, 10) === q.correctMatchIndex;
      } else {
        correct = given === q.correctAnswer;
      }
      return { index: idx, correct };
    });

    const correctCount = results.filter((r) => r.correct).length;
    const score = task.questions.length > 0 ? correctCount / task.questions.length : 0;

    setResult({ score, correct: correctCount, total: task.questions.length, results });

    // Persist score to text-service (fire-and-forget)
    if (user) {
      fetch('/api/text/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, language: language || 'English', level, skill: 'reading', score }),
      }).catch((err) => console.warn('Score submission failed', err));
    }
  };

  const scorePercent = result ? Math.round(result.score * 100) : null;

  // Group questions by type, preserving original indices
  const questionsByType = SECTION_ORDER.map((type) => ({
    type,
    items: task
      ? task.questions
          .map((q, idx) => ({ q, idx }))
          .filter(({ q }) => q.type === type)
      : [],
  })).filter(({ items }) => items.length > 0);

  return (
    <LabFrame>
      <div className="mx-auto max-w-5xl space-y-5">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white p-5 shadow-float">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="mt-1 text-sm text-slate-600">{language} · {level}</p>

          {!task && !loadingTask && (
            <button
              type="button"
              onClick={fetchTask}
              className="mt-4 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
            >
              {t('startReading')}
            </button>
          )}

          {loadingTask && (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              {t('generatingPassage')}
            </div>
          )}

          {taskError && <p className="mt-3 text-sm text-red-600">{taskError}</p>}
        </section>

        {/* ── Passage ───────────────────────────────────────────────────────── */}
        {task && (
          <section className="sticky top-4 z-10 rounded-2xl bg-white p-5 shadow-float">
            <h2 className="mb-3 text-base font-semibold text-slate-800">{t('readTheText')}</h2>
            <article className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
              {result && activeHighlights.size > 0 ? (() => {
                const specs: HighlightSpec[] = [];
                task.questions.forEach((q, idx) => {
                  if (!activeHighlights.has(idx)) return;
                  const text = getCorrectAnswerText(q);
                  if (!text) return;
                  specs.push({ text, colorIndex: idx % HIGHLIGHT_COLORS.length, questionNumber: idx + 1 });
                });
                return buildHighlightedSegments(task.passage, specs).map((seg, si) => {
                  if (seg.highlights.length === 0) return <span key={si}>{seg.text}</span>;
                  let content: ReactNode = (
                    <>
                      {seg.text}
                      {seg.highlights.map((h) => (
                        <sup key={h.questionNumber} className={`ml-0.5 rounded-full px-1 text-[9px] font-bold text-white ${HIGHLIGHT_COLORS[h.colorIndex].badge}`}>
                          {h.questionNumber}
                        </sup>
                      ))}
                    </>
                  );
                  for (const h of [...seg.highlights].reverse()) {
                    const prev = content;
                    content = <span key={h.colorIndex} className={`${HIGHLIGHT_COLORS[h.colorIndex].bg} rounded-sm`}>{prev}</span>;
                  }
                  return <span key={si}>{content}</span>;
                });
              })() : task.passage}
            </article>
          </section>
        )}

        {/* ── Questions by section ──────────────────────────────────────────── */}
        {task && questionsByType.map(({ type, items }) => (
          <section key={type} className="rounded-2xl bg-white p-5 shadow-float">
            <h2 className="mb-4 text-base font-semibold text-slate-800">
              {t(SECTION_LABEL_KEYS[type] as Parameters<typeof t>[0])}
            </h2>
            <div className="space-y-5">
              {items.map(({ q, idx }) => {
                const qResult = result?.results.find((r) => r.index === idx);
                const given = answers[idx];

                return (
                  <QuestionBlock
                    key={idx}
                    question={q}
                    index={idx}
                    given={given}
                    qResult={qResult}
                    locked={!!result}
                    onAnswer={setAnswer}
                    highlighted={activeHighlights.has(idx)}
                    onToggleHighlight={toggleHighlight}
                  />
                );
              })}
            </div>
          </section>
        ))}

        {/* ── Submit ────────────────────────────────────────────────────────── */}
        {task && !result && (
          <section className="rounded-2xl bg-white p-5 shadow-float">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!allAnswered}
                className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40"
              >
                {t('submitAnswers')}
              </button>
              {!allAnswered && (
                <p className="text-xs text-slate-500">{t('answerAll')}</p>
              )}
            </div>
          </section>
        )}

        {/* ── Result ────────────────────────────────────────────────────────── */}
        {result && (
          <section className="rounded-2xl bg-white p-5 shadow-float">
            <h2 className="text-lg font-semibold">{t('result')}</h2>
            <div className="mt-3 flex items-center gap-4">
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ${
                  scorePercent === 100
                    ? 'bg-teal-600'
                    : scorePercent! >= 60
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
              >
                {scorePercent}%
              </div>
              <p className="text-sm text-slate-700">
                {t('resultSummary', { correct: result.correct, total: result.total })}{' '}
                {scorePercent === 100
                  ? t('perfectScore')
                  : scorePercent! >= 60
                    ? t('goodEffort')
                    : t('keepPractising')}
              </p>
            </div>

            <button
              type="button"
              onClick={fetchTask}
              disabled={loadingTask}
              className="mt-4 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40"
            >
              {loadingTask ? t('loading') : t('nextTask')}
            </button>
          </section>
        )}

      </div>
    </LabFrame>
  );
}

// ── Question block ────────────────────────────────────────────────────────────

interface QuestionBlockProps {
  question: ReadingQuestion;
  index: number;
  given: string | undefined;
  qResult: QuestionResult | undefined;
  locked: boolean;
  onAnswer: (index: number, value: string) => void;
  highlighted: boolean;
  onToggleHighlight: (index: number) => void;
}

function QuestionBlock({ question: q, index, given, qResult, locked, onAnswer, highlighted, onToggleHighlight }: QuestionBlockProps) {
  const t = useTranslations('reading');

  const color = HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length];
  const findToggle = qResult ? (
    <label className={`mt-2 inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
      highlighted
        ? `${color.bg} border-transparent text-slate-700`
        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
    }`}>
      <input
        type="checkbox"
        className="sr-only"
        checked={highlighted}
        onChange={() => onToggleHighlight(index)}
      />
      <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M6.5 1a5.5 5.5 0 1 0 3.613 9.72l3.584 3.583a.75.75 0 1 0 1.06-1.06L11.174 9.66A5.5 5.5 0 0 0 6.5 1zM2.5 6.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0z" />
      </svg>
      Find in passage
    </label>
  ) : null;

  const questionLabel = (
    <p className="mb-3 text-sm font-medium text-slate-800">
      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
        {index + 1}
      </span>
      {q.question ?? q.matchingIdea}
    </p>
  );

  // ── Multiple Choice / Vocabulary / Main Idea ─────────────────────────────
  if (q.type === 'multiple_choice' || q.type === 'vocabulary' || q.type === 'main_idea') {
    const options = q.options ?? [];
    return (
      <div>
        {questionLabel}
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((opt, optIdx) => {
            const label = OPTION_LABELS[optIdx];
            const isSelected = given === label;
            let stateClass = 'border-slate-200 bg-white text-slate-700 hover:border-slate-300';
            if (qResult) {
              if (label === q.correctAnswer) {
                stateClass = 'border-teal-500 bg-teal-50 text-teal-900';
              } else if (isSelected && !qResult.correct) {
                stateClass = 'border-red-400 bg-red-50 text-red-800';
              } else {
                stateClass = 'border-slate-200 bg-white text-slate-400';
              }
            } else if (isSelected) {
              stateClass = 'border-teal-600 bg-teal-50 text-teal-900';
            }
            return (
              <button
                key={optIdx}
                type="button"
                disabled={locked}
                onClick={() => onAnswer(index, label)}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default ${stateClass}`}
              >
                <span className="mr-1.5 font-semibold">{label}.</span>
                {opt}
              </button>
            );
          })}
        </div>
        {qResult && (
          <p className={`mt-2 text-xs font-medium ${qResult.correct ? 'text-teal-700' : 'text-red-600'}`}>
            {qResult.correct ? t('correct') : t('incorrect', { answer: q.correctAnswer ?? '' })}
          </p>
        )}
        {findToggle}
      </div>
    );
  }

  // ── True / False / Not Given ─────────────────────────────────────────────
  if (q.type === 'true_false_ng') {
    const tfOptions = [
      { label: t('true'), value: 'T' },
      { label: t('false'), value: 'F' },
      { label: t('notGiven'), value: 'NG' },
    ];
    return (
      <div>
        {questionLabel}
        <div className="flex gap-2">
          {tfOptions.map(({ label, value }) => {
            const isSelected = given === value;
            let stateClass = 'border-slate-200 bg-white text-slate-700 hover:border-slate-300';
            if (qResult) {
              if (value === q.correctAnswer) {
                stateClass = 'border-teal-500 bg-teal-50 text-teal-900';
              } else if (isSelected && !qResult.correct) {
                stateClass = 'border-red-400 bg-red-50 text-red-800';
              } else {
                stateClass = 'border-slate-200 bg-white text-slate-400';
              }
            } else if (isSelected) {
              stateClass = 'border-teal-600 bg-teal-50 text-teal-900';
            }
            return (
              <button
                key={value}
                type="button"
                disabled={locked}
                onClick={() => onAnswer(index, value)}
                className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-default ${stateClass}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {qResult && (
          <p className={`mt-2 text-xs font-medium ${qResult.correct ? 'text-teal-700' : 'text-red-600'}`}>
            {qResult.correct ? t('correct') : (() => {
              const tfngMap: Record<string, string> = { T: t('true'), F: t('false'), NG: t('notGiven') };
              return t('incorrect', { answer: tfngMap[String(q.correctAnswer)] ?? q.correctAnswer ?? '' });
            })()}
          </p>
        )}
        {findToggle}
      </div>
    );
  }

  // ── Matching ─────────────────────────────────────────────────────────────
  if (q.type === 'matching') {
    const opts = q.matchingOptions ?? [];
    const dropdownOptions = [
      { value: '', label: t('selectMeaning') },
      ...opts.map((opt, optIdx) => ({ value: String(optIdx), label: opt })),
    ];
    return (
      <div>
        {questionLabel}
        <div className={locked ? 'pointer-events-none opacity-70' : ''}>
          <SelectDropdown
            value={given ?? ''}
            options={dropdownOptions}
            onChange={(v) => onAnswer(index, v)}
          />
        </div>
        {qResult && (
          <p className={`mt-2 text-xs font-medium ${qResult.correct ? 'text-teal-700' : 'text-red-600'}`}>
            {qResult.correct
              ? t('correct')
              : t('incorrect', { answer: opts[q.correctMatchIndex ?? 0] ?? '' })}
          </p>
        )}
        {findToggle}
      </div>
    );
  }

  return null;
}
