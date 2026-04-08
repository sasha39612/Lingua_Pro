'use client';

import { useCallback, useRef, useState } from 'react';
import { LabFrame } from '@/components/lab-frame';
import { useAppStore } from '@/store/app-store';

// ── Types ────────────────────────────────────────────────────────────────────

interface ListeningQuestion {
  index: number;
  question: string;
  options: [string, string, string, string];
}

interface ListeningTask {
  taskId: number;
  audioUrl: string | null;
  audioBase64: string | null;
  mimeType: string | null;
  questions: ListeningQuestion[];
  durationEstimateMs: number | null;
}

interface QuestionResult {
  questionIndex: number;
  question: string;
  correct: boolean;
  userAnswer: number;
  correctAnswer: number;
  correctOptionText: string;
}

interface AnswersResult {
  score: number;
  correct: number;
  total: number;
  results: QuestionResult[];
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

// ── Component ────────────────────────────────────────────────────────────────

export function ListeningPage() {
  const language = useAppStore((s) => s.language);
  const level = useAppStore((s) => s.level);
  const user = useAppStore((s) => s.user);

  const [task, setTask] = useState<ListeningTask | null>(null);
  // selectedAnswers[i] = option index (0-3) or null if not yet chosen
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<AnswersResult | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchTask = useCallback(async () => {
    if (!user) {
      setTaskError('You must be logged in to load a listening task.');
      return;
    }
    setLoadingTask(true);
    setTaskError(null);
    setTask(null);
    setSelectedAnswers([]);
    setResult(null);
    setSubmitError(null);

    try {
      const params = new URLSearchParams({ language, level, userId: user.id });
      const res = await fetch(`/api/audio/listening-task?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Failed to load task');
      }
      const loaded = data as ListeningTask;
      setTask(loaded);
      setSelectedAnswers(new Array(loaded.questions.length).fill(null));
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'Failed to load listening task.');
    } finally {
      setLoadingTask(false);
    }
  }, [language, level, user]);

  const handleSelectAnswer = (questionIndex: number, optionIndex: number) => {
    if (result) return; // locked after submission
    setSelectedAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
  };

  const allAnswered = selectedAnswers.length > 0 && selectedAnswers.every((a) => a !== null);

  const handleSubmit = async () => {
    if (!task || !user || !allAnswered) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/audio/listening-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.taskId,
          answers: selectedAnswers as number[],
          userId: user.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Failed to submit answers');
      }
      setResult(data as AnswersResult);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit answers.');
    } finally {
      setSubmitting(false);
    }
  };

  const audioSrc =
    task?.audioUrl ?? (task?.audioBase64 ? `data:audio/mpeg;base64,${task.audioBase64}` : null);

  const scorePercent = result ? Math.round(result.score * 100) : null;

  return (
    <LabFrame>
      <div className="mx-auto max-w-5xl space-y-5">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white p-5 shadow-float">
          <h1 className="text-2xl font-bold">Listening</h1>
          <p className="mt-1 text-sm text-slate-600">
            {language} · {level}
          </p>

          {!task && !loadingTask && (
            <button
              type="button"
              onClick={fetchTask}
              className="mt-4 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
            >
              Play
            </button>
          )}

          {loadingTask && (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              Generating audio passage… this may take up to 30 seconds
            </div>
          )}

          {taskError && <p className="mt-3 text-sm text-red-600">{taskError}</p>}

          {task && audioSrc && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-slate-500">
                Listen to the audio, then answer all 5 questions below.
              </p>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio
                ref={audioRef}
                key={task.taskId}
                controls
                autoPlay
                className="w-full"
                src={audioSrc}
              />
            </div>
          )}

          {task && !audioSrc && (
            <p className="mt-4 text-sm text-amber-600">
              Audio is not available for this task. Read the questions and answer based on context.
            </p>
          )}
        </section>

        {/* ── Questions ───────────────────────────────────────────────────── */}
        {task && task.questions.length > 0 && (
          <section className="space-y-4">
            {task.questions.map((q) => {
              const qResult = result?.results.find((r) => r.questionIndex === q.index);
              const chosen = selectedAnswers[q.index] ?? null;

              return (
                <div key={q.index} className="rounded-2xl bg-white p-5 shadow-float">
                  <p className="mb-3 text-sm font-semibold text-slate-800">
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                      {q.index + 1}
                    </span>
                    {q.question}
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((option, optIdx) => {
                      const label = OPTION_LABELS[optIdx];
                      const isSelected = chosen === optIdx;

                      // Colouring after submission
                      let stateClass = 'border-slate-200 bg-white text-slate-700 hover:border-slate-300';
                      if (qResult) {
                        if (optIdx === qResult.correctAnswer) {
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
                          disabled={!!result}
                          onClick={() => handleSelectAnswer(q.index, optIdx)}
                          className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default ${stateClass}`}
                        >
                          <span className="mr-1.5 font-semibold">{label}.</span>
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {qResult && (
                    <p className={`mt-2 text-xs font-medium ${qResult.correct ? 'text-teal-700' : 'text-red-600'}`}>
                      {qResult.correct
                        ? 'Correct!'
                        : `Incorrect — correct answer: ${OPTION_LABELS[qResult.correctAnswer]}. ${qResult.correctOptionText}`}
                    </p>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* ── Submit / Result ──────────────────────────────────────────────── */}
        {task && !result && (
          <section className="rounded-2xl bg-white p-5 shadow-float">
            {submitError && <p className="mb-3 text-sm text-red-600">{submitError}</p>}

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!allAnswered || submitting}
                className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40"
              >
                {submitting ? 'Submitting…' : 'Submit Answers'}
              </button>
              {!allAnswered && (
                <p className="text-xs text-slate-500">
                  Answer all {task.questions.length} questions to submit
                </p>
              )}
            </div>
          </section>
        )}

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
                    : 'Keep practising — listen again and try a new task.'}
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
