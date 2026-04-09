'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { LabFrame } from '@/components/lab-frame';
import { useAppStore } from '@/store/app-store';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WritingTask {
  situation: string;
  taskDescription: string;
  taskPoints: string[];
  wordCountMin: number;
  wordCountMax: number;
  style: string;
  instructions: string[];
  exampleStructure: string[];
}

interface WritingCriterion {
  score: number;
  feedback: string;
}

interface WritingAnalysis {
  taskAchievement: WritingCriterion;
  grammarVocabulary: WritingCriterion;
  coherenceStructure: WritingCriterion;
  style: WritingCriterion;
  correctedText: string;
  overallScore: number;
  overallFeedback: string;
}

type Phase = 'idle' | 'task' | 'editor' | 'result';

// ── Helpers ───────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function scoreColor(score: number): string {
  if (score >= 0.8) return 'bg-teal-600';
  if (score >= 0.6) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreLabel(score: number): string {
  if (score >= 0.8) return 'text-teal-700';
  if (score >= 0.6) return 'text-amber-600';
  return 'text-red-600';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CriterionCard({ label, criterion }: { label: string; criterion: WritingCriterion }) {
  const pct = Math.round(criterion.score * 100);
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${scoreColor(criterion.score)}`}
        >
          {pct}%
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <p className={`mt-0.5 text-xs ${scoreLabel(criterion.score)}`}>{criterion.feedback}</p>
        </div>
      </div>
    </div>
  );
}

function WordCounter({
  count,
  min,
  max,
}: {
  count: number;
  min: number;
  max: number;
}) {
  const inRange = count >= min && count <= max;
  const tooFew = count < min;
  const colorClass = inRange
    ? 'text-teal-700 font-semibold'
    : tooFew
      ? 'text-slate-400'
      : 'text-amber-600 font-semibold';

  return (
    <span className={`text-xs ${colorClass}`}>
      {count} / {min}–{max} words
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function WritingPage() {
  const language = useAppStore((s) => s.language);
  const level = useAppStore((s) => s.level);
  const user = useAppStore((s) => s.user);

  const [phase, setPhase] = useState<Phase>('idle');
  const [task, setTask] = useState<WritingTask | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<WritingAnalysis | null>(null);
  const [taskCollapsed, setTaskCollapsed] = useState(false);
  const [showCorrected, setShowCorrected] = useState(false);
  const [loadingTask, setLoadingTask] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = useMemo(() => countWords(text), [text]);
  const minWords = task?.wordCountMin ?? 120;
  const maxWords = task?.wordCountMax ?? 180;
  const canSubmit = wordCount >= minWords;

  // ── Fetch task ─────────────────────────────────────────────────────────────

  const fetchTask = useCallback(async () => {
    if (!user) {
      setError('You must be logged in to load a writing task.');
      return;
    }
    setLoadingTask(true);
    setError(null);
    setTask(null);
    setText('');
    setAnalysis(null);
    setTaskCollapsed(false);
    setShowCorrected(false);

    try {
      const params = new URLSearchParams({ language, level, userId: String(user.id) });
      const res = await fetch(`/api/writing/task?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Failed to load task');
      setTask(data.writingTask as WritingTask);
      setTaskId(data.taskId);
      setPhase('task');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load writing task.');
    } finally {
      setLoadingTask(false);
    }
  }, [language, level, user]);

  // ── Submit text ────────────────────────────────────────────────────────────

  const submitText = useCallback(async () => {
    if (!task || !canSubmit) return;
    setLoadingAnalysis(true);
    setError(null);

    try {
      const res = await fetch('/api/writing/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language, taskContext: task }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Analysis failed');
      setAnalysis(data as WritingAnalysis);
      setPhase('result');

      // Persist score to text-service (fire-and-forget)
      if (user) {
        fetch('/api/text/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, language, skill: 'writing', score: data.overallScore }),
        }).catch(() => { /* best-effort */ });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setLoadingAnalysis(false);
    }
  }, [task, text, language, canSubmit]);

  const overallPct = analysis ? Math.round(analysis.overallScore * 100) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <LabFrame>
      <div className="mx-auto max-w-3xl space-y-5">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white p-5 shadow-float">
          <h1 className="text-2xl font-bold">Writing</h1>
          <p className="mt-1 text-sm text-slate-500">{language} · {level}</p>

          {phase === 'idle' && (
            <>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={fetchTask}
                disabled={loadingTask}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
              >
                {loadingTask ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                    Generating task…
                  </>
                ) : (
                  'Generate Task'
                )}
              </button>
            </>
          )}

          {(phase === 'task' || phase === 'editor' || phase === 'result') && (
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={fetchTask}
                disabled={loadingTask || loadingAnalysis}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                {loadingTask ? 'Loading…' : 'New Task'}
              </button>
            </div>
          )}
        </section>

        {/* ── Task card (phases: task, editor, result) ─────────────────────── */}
        {task && (phase === 'task' || phase === 'editor' || phase === 'result') && (
          <section className="rounded-2xl bg-white p-5 shadow-float">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">Your Task</h2>
              {phase !== 'task' && (
                <button
                  type="button"
                  onClick={() => setTaskCollapsed((v) => !v)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  {taskCollapsed ? 'Show task ▾' : 'Hide task ▴'}
                </button>
              )}
            </div>

            {!taskCollapsed && (
              <div className="mt-4 space-y-4 text-sm">
                {/* Situation */}
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">📌 Situation</p>
                  <p className="text-slate-700">{task.situation}</p>
                </div>

                {/* Task */}
                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">📝 Task</p>
                  <p className="mb-2 text-slate-700">{task.taskDescription}</p>
                  <ul className="space-y-1">
                    {task.taskPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-700">
                        <span className="mt-0.5 shrink-0 text-amber-500">▸</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
                {task.instructions.length > 0 && (
                  <div className="rounded-xl bg-red-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-500">⚠️ Instructions</p>
                    <ul className="space-y-1">
                      {task.instructions.map((instr, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-700">
                          <span className="shrink-0 text-red-400">•</span>
                          {instr}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Example structure */}
                {task.exampleStructure.length > 0 && (
                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-500">📧 Example structure</p>
                    <ol className="list-decimal space-y-1 pl-4">
                      {task.exampleStructure.map((step, i) => (
                        <li key={i} className="text-slate-700">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

            {/* CTA inside task card */}
            {phase === 'task' && (
              <button
                type="button"
                onClick={() => {
                  setPhase('editor');
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
                className="mt-5 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-400"
              >
                Start Writing
              </button>
            )}
          </section>
        )}

        {/* ── Editor ──────────────────────────────────────────────────────── */}
        {phase === 'editor' && task && (
          <section className="rounded-2xl bg-white p-5 shadow-float">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">Your response</h2>
              <WordCounter count={wordCount} min={minWords} max={maxWords} />
            </div>

            <textarea
              ref={textareaRef}
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start writing here…"
              className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-relaxed text-slate-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
            />

            {/* Word count bar */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  wordCount > maxWords ? 'bg-amber-400' : wordCount >= minWords ? 'bg-teal-500' : 'bg-slate-300'
                }`}
                style={{ width: `${Math.min(100, (wordCount / maxWords) * 100)}%` }}
              />
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-4 flex items-center gap-4">
              <button
                type="button"
                onClick={submitText}
                disabled={!canSubmit || loadingAnalysis}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-40"
              >
                {loadingAnalysis ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                    Evaluating…
                  </>
                ) : (
                  'Submit'
                )}
              </button>
              {!canSubmit && (
                <p className="text-xs text-slate-400">
                  Write at least {minWords} words to submit ({minWords - wordCount} more needed)
                </p>
              )}
            </div>
          </section>
        )}

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {phase === 'result' && analysis && (
          <>
            {/* Overall score */}
            <section className="rounded-2xl bg-white p-5 shadow-float">
              <h2 className="text-base font-semibold text-slate-800">Result</h2>
              <div className="mt-4 flex items-center gap-4">
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ${scoreColor(analysis.overallScore)}`}
                >
                  {overallPct}%
                </div>
                <p className="text-sm leading-relaxed text-slate-700">{analysis.overallFeedback}</p>
              </div>
            </section>

            {/* Criteria */}
            <section className="rounded-2xl bg-white p-5 shadow-float">
              <h2 className="mb-4 text-base font-semibold text-slate-800">Detailed feedback</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <CriterionCard label="Task Achievement" criterion={analysis.taskAchievement} />
                <CriterionCard label="Grammar & Vocabulary" criterion={analysis.grammarVocabulary} />
                <CriterionCard label="Coherence & Structure" criterion={analysis.coherenceStructure} />
                <CriterionCard label="Style" criterion={analysis.style} />
              </div>
            </section>

            {/* Corrected text */}
            <section className="rounded-2xl bg-white p-5 shadow-float">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800">Corrected version</h2>
                <button
                  type="button"
                  onClick={() => setShowCorrected((v) => !v)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  {showCorrected ? 'Hide ▴' : 'Show ▾'}
                </button>
              </div>
              {showCorrected && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                  {analysis.correctedText}
                </div>
              )}
            </section>

            {/* Your original */}
            <section className="rounded-2xl bg-white p-5 shadow-float">
              <h2 className="mb-3 text-base font-semibold text-slate-800">Your original text</h2>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {text}
              </div>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPhase('editor');
                    setAnalysis(null);
                    setError(null);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Edit & Resubmit
                </button>
                <button
                  type="button"
                  onClick={fetchTask}
                  disabled={loadingTask}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-40"
                >
                  Try Another Task
                </button>
              </div>
            </section>
          </>
        )}

      </div>
    </LabFrame>
  );
}
