'use client';

import { useCallback, useRef, useState } from 'react';
import { LabFrame } from '@/components/lab-frame';
import { useAppStore } from '@/store/app-store';

// ── Types ────────────────────────────────────────────────────────────────────

type ListeningDifficulty = 'B1' | 'B2' | 'C1' | 'C2';
type ListeningQuestionType = 'multiple_choice' | 'true_false_ng' | 'short_answer' | 'paraphrase';

interface ListeningQuestion {
  index: number;
  type?: ListeningQuestionType;
  difficulty?: ListeningDifficulty;
  points?: number;
  question: string;
  options?: string[];
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
  type?: string;
  correct: boolean;
  userAnswer: number | string;
  correctAnswer: number | string;
  correctOptionText?: string;
  points: number;
  maxPoints: number;
}

interface AnswersResult {
  score: number;
  rawScore: number;
  maxRawScore: number;
  correct: number;
  total: number;
  cefrLevel?: string;
  results: QuestionResult[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;
const MAX_PLAYS = 2;

const DIFFICULTY_BADGE: Record<ListeningDifficulty, string> = {
  B1: 'bg-green-100 text-green-700',
  B2: 'bg-blue-100 text-blue-700',
  C1: 'bg-purple-100 text-purple-700',
  C2: 'bg-red-100 text-red-700',
};

const TFNG_OPTIONS = [
  { label: 'True', value: 'T' },
  { label: 'False', value: 'F' },
  { label: 'Not Given', value: 'NG' },
];

// ── Component ────────────────────────────────────────────────────────────────

export function ListeningPage() {
  const language = useAppStore((s) => s.language);
  const level = useAppStore((s) => s.level);
  const user = useAppStore((s) => s.user);

  const [task, setTask] = useState<ListeningTask | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Array<number | string | null>>([]);
  const [result, setResult] = useState<AnswersResult | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [playsUsed, setPlaysUsed] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isNewFormat = task?.questions.some((q) => 'difficulty' in q && q.difficulty !== undefined) ?? false;

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
    setPlaysUsed(0);

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

  const handleSelectAnswer = (questionIndex: number, value: number | string) => {
    if (result) return;
    setSelectedAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = value;
      return next;
    });
  };

  const allAnswered =
    selectedAnswers.length > 0 &&
    selectedAnswers.every((a) => a !== null && a !== undefined);

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
          answers: selectedAnswers,
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
                {isNewFormat
                  ? `Listen carefully. You may play the audio up to ${MAX_PLAYS} times. Then answer all ${task.questions.length} questions below.`
                  : 'Listen to the audio, then answer all questions below.'}
              </p>

              {/* Custom play button with play-count tracking */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (playsUsed < MAX_PLAYS) {
                      audioRef.current?.play();
                    }
                  }}
                  disabled={playsUsed >= MAX_PLAYS}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-teal-600">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                  </svg>
                  {playsUsed >= MAX_PLAYS
                    ? `Audio used (${MAX_PLAYS}/${MAX_PLAYS})`
                    : `Play audio (${playsUsed}/${MAX_PLAYS})`}
                </button>
                {playsUsed >= MAX_PLAYS && (
                  <p className="text-xs text-amber-600">Play limit reached. Proceed with your answers.</p>
                )}
              </div>

              {/* Hidden audio element — controlled programmatically */}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio
                ref={audioRef}
                key={task.taskId}
                src={audioSrc}
                onPlay={() => setPlaysUsed((p) => p + 1)}
                className="hidden"
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
              const chosen = selectedAnswers[q.index];
              const qType = q.type ?? 'multiple_choice';

              return (
                <div key={q.index} className="rounded-2xl bg-white p-5 shadow-float">
                  {/* Question header */}
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                        {q.index + 1}
                      </span>
                      {q.question}
                    </p>
                    {q.difficulty && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${DIFFICULTY_BADGE[q.difficulty]}`}>
                        {q.difficulty} · {q.points}pt{q.points !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Multiple choice */}
                  {qType === 'multiple_choice' && q.options && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {q.options.map((option, optIdx) => {
                        const label = OPTION_LABELS[optIdx];
                        const isSelected = chosen === optIdx;
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
                  )}

                  {/* Short answer / Paraphrase — dropdown */}
                  {(qType === 'short_answer' || qType === 'paraphrase') && q.options && (
                    <div className="relative">
                      <select
                        value={typeof chosen === 'number' ? chosen : ''}
                        onChange={(e) => handleSelectAnswer(q.index, Number(e.target.value))}
                        disabled={!!result}
                        className={`w-full appearance-none rounded-xl border px-4 py-3 pr-10 text-sm focus:outline-none disabled:cursor-default ${
                          qResult
                            ? qResult.correct
                              ? 'border-teal-500 bg-teal-50 text-teal-900'
                              : 'border-red-400 bg-red-50 text-red-800'
                            : typeof chosen === 'number'
                              ? 'border-teal-600 bg-teal-50 text-teal-900'
                              : 'border-slate-200 bg-white text-slate-500'
                        }`}
                      >
                        <option value="" disabled>Select an answer…</option>
                        {q.options.map((option, optIdx) => (
                          <option key={optIdx} value={optIdx}>
                            {OPTION_LABELS[optIdx]}. {option}
                          </option>
                        ))}
                      </select>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      >
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* True / False / Not Given */}
                  {qType === 'true_false_ng' && (
                    <div className="flex flex-wrap gap-2">
                      {TFNG_OPTIONS.map(({ label, value }) => {
                        const isSelected = chosen === value;
                        let stateClass = 'border-slate-200 bg-white text-slate-700 hover:border-slate-300';
                        if (qResult) {
                          if (value === String(qResult.correctAnswer)) {
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
                            disabled={!!result}
                            onClick={() => handleSelectAnswer(q.index, value)}
                            className={`rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-default ${stateClass}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Per-question feedback after submission */}
                  {qResult && (
                    <p className={`mt-2 text-xs font-medium ${qResult.correct ? 'text-teal-700' : 'text-red-600'}`}>
                      {qResult.correct
                        ? `Correct! (+${qResult.points}pt${qResult.points !== 1 ? 's' : ''})`
                        : (() => {
                            const ca = qResult.correctAnswer;
                            if (qType === 'multiple_choice' || qType === 'paraphrase' || qType === 'short_answer') {
                              const idx = typeof ca === 'number' ? ca : parseInt(String(ca), 10);
                              return `Incorrect — correct answer: ${OPTION_LABELS[idx]}. ${qResult.correctOptionText ?? ''}`;
                            }
                            if (qType === 'true_false_ng') {
                              const map: Record<string, string> = { T: 'True', F: 'False', NG: 'Not Given' };
                              return `Incorrect — correct answer: ${map[String(ca)] ?? ca}`;
                            }
                            return `Incorrect — correct answer: ${ca}`;
                          })()}
                    </p>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* ── Submit ───────────────────────────────────────────────────────── */}
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

        {/* ── Result ───────────────────────────────────────────────────────── */}
        {result && (
          <section className="rounded-2xl bg-white p-5 shadow-float">
            <h2 className="text-lg font-semibold">Result</h2>

            <div className="mt-3 flex items-center gap-4">
              {isNewFormat ? (
                <>
                  <div
                    className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full text-white ${
                      result.rawScore >= 18
                        ? 'bg-teal-600'
                        : result.rawScore >= 13
                          ? 'bg-blue-500'
                          : result.rawScore >= 7
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                    }`}
                  >
                    <span className="text-lg font-bold leading-none">{result.rawScore}</span>
                    <span className="text-xs opacity-80">/{result.maxRawScore}</span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-700">
                      {result.correct} of {result.total} correct.
                    </p>
                    {result.cefrLevel && (
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        Comprehension level:{' '}
                        <span className={`rounded-full px-2 py-0.5 text-xs ${DIFFICULTY_BADGE[result.cefrLevel as ListeningDifficulty] ?? 'bg-slate-100 text-slate-700'}`}>
                          {result.cefrLevel}
                        </span>
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
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
