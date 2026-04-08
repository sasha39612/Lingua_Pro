'use client';

import { useCallback, useRef, useState } from 'react';
import { LabFrame } from '@/components/lab-frame';
import { useAppStore } from '@/store/app-store';

interface ListeningTask {
  taskId: number;
  prompt: string;
  audioUrl: string | null;
  audioBase64: string | null;
  mimeType: string | null;
  answerOptions: string[];
  durationEstimateMs: number | null;
}

interface ScoreResult {
  score: number;
  correct: number;
  total: number;
}

export function ListeningPage() {
  const language = useAppStore((s) => s.language);
  const level = useAppStore((s) => s.level);
  const user = useAppStore((s) => s.user);

  const [task, setTask] = useState<ListeningTask | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreResult | null>(null);
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
    setSelectedAnswer(null);
    setResult(null);
    setSubmitError(null);

    try {
      const params = new URLSearchParams({
        language,
        level,
        userId: user.id,
      });
      const res = await fetch(`/api/audio/listening-task?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Failed to load task');
      }
      setTask(data as ListeningTask);
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'Failed to load listening task.');
    } finally {
      setLoadingTask(false);
    }
  }, [language, level, user]);

  const handlePlay = () => {
    if (!task) {
      fetchTask();
      return;
    }
    audioRef.current?.play();
  };

  const handleSubmit = async () => {
    if (!task || !selectedAnswer || !user) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/audio/listening-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.taskId,
          answers: [selectedAnswer],
          userId: user.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Failed to submit answer');
      }
      setResult(data as ScoreResult);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextTask = () => {
    fetchTask();
  };

  const audioSrc = task?.audioUrl ?? (task?.audioBase64 ? `data:audio/mpeg;base64,${task.audioBase64}` : null);
  const scorePercent = result ? Math.round(result.score * 100) : null;

  return (
    <LabFrame>
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Header + Play button */}
        <section className="rounded-2xl bg-white p-5 shadow-float">
          <h1 className="text-2xl font-bold">Listening</h1>
          <p className="mt-1 text-sm text-slate-600">
            {language} · {level} — press Play to load a task
          </p>

          {!task && !loadingTask && (
            <button
              type="button"
              onClick={handlePlay}
              className="mt-4 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
            >
              Play
            </button>
          )}

          {loadingTask && (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              Loading task…
            </div>
          )}

          {taskError && (
            <p className="mt-3 text-sm text-red-600">{taskError}</p>
          )}

          {task && audioSrc && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-slate-700">{task.prompt}</p>
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
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-slate-700">{task.prompt}</p>
              <p className="text-sm text-amber-600">Audio is not available for this task.</p>
            </div>
          )}
        </section>

        {/* Answer options */}
        {task && !result && (
          <section className="rounded-2xl bg-white p-5 shadow-float">
            <h2 className="text-lg font-semibold">Choose the correct answer</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {task.answerOptions.map((option, index) => {
                const label = String.fromCharCode(65 + index); // A, B, C, D
                const isSelected = selectedAnswer === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSelectedAnswer(label)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50 text-teal-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-semibold">{label}.</span> {option}
                  </button>
                );
              })}
            </div>

            {submitError && (
              <p className="mt-3 text-sm text-red-600">{submitError}</p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedAnswer || submitting}
              className="mt-4 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40"
            >
              {submitting ? 'Submitting…' : 'Submit Answer'}
            </button>
          </section>
        )}

        {/* Score result */}
        {result && (
          <section className="rounded-2xl bg-white p-5 shadow-float">
            <h2 className="text-lg font-semibold">Result</h2>
            <div className="mt-3 flex items-center gap-4">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white ${
                  scorePercent === 100 ? 'bg-teal-600' : 'bg-amber-500'
                }`}
              >
                {scorePercent}%
              </div>
              <p className="text-sm text-slate-700">
                {scorePercent === 100
                  ? 'Perfect! You answered correctly.'
                  : 'Not quite. Listen again and try a new task.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleNextTask}
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
