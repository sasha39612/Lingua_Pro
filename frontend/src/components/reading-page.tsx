'use client';

import { useCallback, useState } from 'react';
import { LabFrame } from '@/components/lab-frame';
import { useAppStore } from '@/store/app-store';

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

const SECTION_LABELS: Record<ReadingQuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false_ng: 'True / False / Not Given',
  matching: 'Matching',
  vocabulary: 'Vocabulary in Context',
  main_idea: 'Main Idea',
};

const SECTION_ORDER: ReadingQuestionType[] = [
  'multiple_choice',
  'true_false_ng',
  'matching',
  'vocabulary',
  'main_idea',
];

// ── Component ────────────────────────────────────────────────────────────────

export function ReadingPage() {
  const language = useAppStore((s) => s.language);
  const level = useAppStore((s) => s.level);
  const user = useAppStore((s) => s.user);

  const [task, setTask] = useState<ReadingTask | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<AnswersResult | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    if (!user) {
      setTaskError('You must be logged in to load a reading task.');
      return;
    }
    setLoadingTask(true);
    setTaskError(null);
    setTask(null);
    setAnswers({});
    setResult(null);

    try {
      const params = new URLSearchParams({ language, level, userId: user.id });
      const res = await fetch(`/api/reading/task?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Failed to load task');
      }
      setTask(data as ReadingTask);
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'Failed to load reading task.');
    } finally {
      setLoadingTask(false);
    }
  }, [language, level, user]);

  const setAnswer = (index: number, value: string) => {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const allAnswered =
    task !== null &&
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
    setResult({
      score: correctCount / task.questions.length,
      correct: correctCount,
      total: task.questions.length,
      results,
    });
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
          <h1 className="text-2xl font-bold">Reading</h1>
          <p className="mt-1 text-sm text-slate-600">{language} · {level}</p>

          {!task && !loadingTask && (
            <button
              type="button"
              onClick={fetchTask}
              className="mt-4 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
            >
              Start Reading
            </button>
          )}

          {loadingTask && (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              Generating reading passage…
            </div>
          )}

          {taskError && <p className="mt-3 text-sm text-red-600">{taskError}</p>}
        </section>

        {/* ── Passage ───────────────────────────────────────────────────────── */}
        {task && (
          <section className="rounded-2xl bg-white p-5 shadow-float">
            <h2 className="mb-3 text-base font-semibold text-slate-800">Read the text</h2>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
              {task.passage}
            </article>
          </section>
        )}

        {/* ── Questions by section ──────────────────────────────────────────── */}
        {task && questionsByType.map(({ type, items }) => (
          <section key={type} className="rounded-2xl bg-white p-5 shadow-float">
            <h2 className="mb-4 text-base font-semibold text-slate-800">
              {SECTION_LABELS[type]}
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
                Submit Answers
              </button>
              {!allAnswered && (
                <p className="text-xs text-slate-500">Answer all questions to submit</p>
              )}
            </div>
          </section>
        )}

        {/* ── Result ────────────────────────────────────────────────────────── */}
        {result && (
          <section className="rounded-2xl bg-white p-5 shadow-float">
            <h2 className="text-lg font-semibold">Result</h2>
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
                {result.correct} out of {result.total} correct.{' '}
                {scorePercent === 100
                  ? 'Perfect score!'
                  : scorePercent! >= 60
                    ? 'Good effort — review the incorrect answers above.'
                    : 'Keep practising — read again and try a new task.'}
              </p>
            </div>

            <button
              type="button"
              onClick={fetchTask}
              disabled={loadingTask}
              className="mt-4 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40"
            >
              {loadingTask ? 'Loading…' : 'Next Task'}
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
}

function QuestionBlock({ question: q, index, given, qResult, locked, onAnswer }: QuestionBlockProps) {
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
            {qResult.correct ? 'Correct!' : `Incorrect — correct answer: ${q.correctAnswer}`}
          </p>
        )}
      </div>
    );
  }

  // ── True / False / Not Given ─────────────────────────────────────────────
  if (q.type === 'true_false_ng') {
    const tfOptions = [
      { label: 'T', value: 'T' },
      { label: 'F', value: 'F' },
      { label: 'NG', value: 'NG' },
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
            {qResult.correct ? 'Correct!' : `Incorrect — correct answer: ${q.correctAnswer}`}
          </p>
        )}
      </div>
    );
  }

  // ── Matching ─────────────────────────────────────────────────────────────
  if (q.type === 'matching') {
    const opts = q.matchingOptions ?? [];
    const chosenIdx = given !== undefined && given !== '' ? parseInt(given, 10) : -1;
    return (
      <div>
        {questionLabel}
        <select
          disabled={locked}
          value={given ?? ''}
          onChange={(e) => onAnswer(index, e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 disabled:cursor-default disabled:opacity-70"
        >
          <option value="">Select a meaning…</option>
          {opts.map((opt, optIdx) => (
            <option key={optIdx} value={String(optIdx)}>
              {opt}
            </option>
          ))}
        </select>
        {qResult && (
          <p className={`mt-2 text-xs font-medium ${qResult.correct ? 'text-teal-700' : 'text-red-600'}`}>
            {qResult.correct
              ? 'Correct!'
              : `Incorrect — correct answer: ${opts[q.correctMatchIndex ?? 0] ?? ''}`}
          </p>
        )}
        {!qResult && chosenIdx >= 0 && (
          <p className="mt-1 text-xs text-slate-500">Selected: {opts[chosenIdx]}</p>
        )}
      </div>
    );
  }

  return null;
}
