'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { LabFrame } from '@/components/lab-frame';
import { useAppStore } from '@/store/app-store';
import { useAiStream } from '@/lib/use-ai-stream';
import { useTranslations } from 'next-intl';
import { diffWords } from 'diff';

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

// ── Diff types & helper ───────────────────────────────────────────────────────

type DiffToken =
  | { type: 'unchanged'; value: string }
  | { type: 'removed'; value: string }
  | { type: 'added'; value: string }
  | { type: 'replace'; from: string; to: string };

function buildWordDiff(original: string, corrected: string): DiffToken[] {
  const raw = diffWords(original, corrected);
  const tokens: DiffToken[] = [];
  for (let i = 0; i < raw.length; i++) {
    const curr = raw[i];
    const next = raw[i + 1];
    if (curr.removed && next?.added) {
      tokens.push({ type: 'replace', from: curr.value, to: next.value });
      i++;
    } else if (curr.removed) {
      tokens.push({ type: 'removed', value: curr.value });
    } else if (curr.added) {
      tokens.push({ type: 'added', value: curr.value });
    } else {
      tokens.push({ type: 'unchanged', value: curr.value });
    }
  }
  return tokens;
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

function CriterionCardSkeleton({ label }: { label: string }) {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <div className="h-3 w-3/4 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

// ── Diff view ─────────────────────────────────────────────────────────────────

function DiffView({ original, corrected }: { original: string; corrected: string }) {
  const t = useTranslations('writing');
  const lineTokens = useMemo(() => {
    const origLines = original.split('\n');
    const corrLines = corrected.split('\n');
    const count = Math.max(origLines.length, corrLines.length);
    return Array.from({ length: count }, (_, i) =>
      buildWordDiff(origLines[i] ?? '', corrLines[i] ?? '')
    );
  }, [original, corrected]);

  return (
    <div
      className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800"
      aria-label={t('diffViewAriaLabel')}
    >
      {lineTokens.map((tokens, li) => (
        <span key={li}>
          {tokens.map((token, ti) => {
            if (token.type === 'unchanged') return <span key={ti}>{token.value}</span>;
            if (token.type === 'removed') return (
              <span key={ti} className="line-through opacity-60 text-red-600 bg-red-50 rounded px-0.5">
                {token.value}
              </span>
            );
            if (token.type === 'added') return (
              <span key={ti} className="underline decoration-amber-400 decoration-2 text-amber-700 bg-amber-50 rounded px-0.5">
                {token.value}
              </span>
            );
            return (
              <span key={ti}>
                <span className="line-through opacity-60 text-red-600 bg-red-50 rounded-l px-0.5">{token.from}</span>
                <span className="underline decoration-amber-400 decoration-2 text-amber-700 bg-amber-50 rounded-r px-0.5">{token.to}</span>
              </span>
            );
          })}
          {li < lineTokens.length - 1 && <br />}
        </span>
      ))}
    </div>
  );
}

// ── SSE event types ───────────────────────────────────────────────────────────

type WritingStreamEvent =
  | { event: 'analysis_started'; requestId?: string }
  | { event: 'criterion'; data: { key: string; score: number; feedback: string }; requestId?: string }
  | { event: 'analysis_complete'; data: { overallScore: number; overallFeedback: string; correctedText: string; partial?: boolean }; requestId?: string }
  | { event: 'error'; requestId?: string };

function WordCounter({
  count,
  min,
  max,
}: {
  count: number;
  min: number;
  max: number;
}) {
  const t = useTranslations('writing');
  const inRange = count >= min && count <= max;
  const tooFew = count < min;
  const colorClass = inRange
    ? 'text-teal-700 font-semibold'
    : tooFew
      ? 'text-slate-400'
      : 'text-amber-600 font-semibold';

  return (
    <span className={`text-xs ${colorClass}`}>
      {t('wordCounter', { count, min, max })}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function WritingPage() {
  const t = useTranslations('writing');
  const language = useAppStore((s) => s.language);
  const level = useAppStore((s) => s.level);
  const user = useAppStore((s) => s.user);
  const taskTopic = useAppStore((s) => s.taskTopic);

  const [phase, setPhase] = useState<Phase>('idle');
  const [task, setTask] = useState<WritingTask | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [taskCollapsed, setTaskCollapsed] = useState(false);
  const [showCorrected, setShowCorrected] = useState(false);
  const [loadingTask, setLoadingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Streaming analysis state ───────────────────────────────────────────────
  const [streamedCriteria, setStreamedCriteria] = useState<Record<string, WritingCriterion>>({});
  const [streamedComplete, setStreamedComplete] = useState<{
    overallScore: number;
    overallFeedback: string;
    correctedText: string;
    partial?: boolean;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = useMemo(() => countWords(text), [text]);
  const minWords = task?.wordCountMin ?? 120;
  const maxWords = task?.wordCountMax ?? 180;
  const canSubmit = wordCount >= minWords;

  // ── Writing analysis stream ────────────────────────────────────────────────

  const writingStream = useAiStream<WritingStreamEvent>({
    url: '/api/writing/analyze/stream',
    method: 'POST',
    onEvent: useCallback((ev: WritingStreamEvent) => {
      if (ev.event === 'criterion') {
        setStreamedCriteria((prev) => ({
          ...prev,
          [ev.data.key]: { score: ev.data.score, feedback: ev.data.feedback },
        }));
      } else if (ev.event === 'analysis_complete') {
        setStreamedComplete(ev.data);
        setShowCorrected(true);
        // Persist score (fire-and-forget)
        if (user) {
          fetch('/api/text/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, language, level, skill: 'writing', score: ev.data.overallScore }),
          }).catch((err) => console.warn('Score submission failed', err));
        }
      } else if (ev.event === 'error') {
        setError(t('streamError'));
      }
    }, [user, language, t]),
  });

  // ── Fetch task ─────────────────────────────────────────────────────────────

  const fetchTask = useCallback(async () => {
    if (!user) {
      setError(t('authError'));
      return;
    }
    writingStream.cancel();
    setLoadingTask(true);
    setError(null);
    setTask(null);
    setText('');
    setStreamedCriteria({});
    setStreamedComplete(null);
    setTaskCollapsed(false);
    setShowCorrected(false);

    try {
      const params = new URLSearchParams({ language, level, userId: String(user.id) });
      if (taskTopic) params.set('topic', taskTopic);
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
  }, [language, level, user, writingStream, t]);

  // ── Submit text (via SSE stream) ───────────────────────────────────────────

  const submitText = useCallback(() => {
    if (!task || !canSubmit) return;
    setError(null);
    setStreamedCriteria({});
    setStreamedComplete(null);
    setPhase('result');
    writingStream.start({ text, language, taskContext: task });
  }, [task, text, language, canSubmit, writingStream]);

  const overallPct = streamedComplete ? Math.round(streamedComplete.overallScore * 100) : null;
  const isAnalyzing = writingStream.status === 'streaming';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <LabFrame>
      <div className="mx-auto max-w-3xl space-y-5">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white p-5 shadow-float">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{language} · {level}</p>

          {phase === 'idle' && (
            <>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={fetchTask}
                disabled={loadingTask}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
              >
                {loadingTask ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t('generatingTask')}
                  </>
                ) : (
                  t('generateTask')
                )}
              </button>
            </>
          )}

          {(phase === 'task' || phase === 'editor' || phase === 'result') && (
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={fetchTask}
                disabled={loadingTask || isAnalyzing}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                {loadingTask ? t('loadingTask') : t('newTask')}
              </button>
            </div>
          )}
        </section>

        {/* ── Task card (phases: task, editor, result) ─────────────────────── */}
        {task && (phase === 'task' || phase === 'editor' || phase === 'result') && (
          <section className="rounded-2xl bg-white p-5 shadow-float">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">{t('yourTask')}</h2>
              {phase !== 'task' && (
                <button
                  type="button"
                  onClick={() => setTaskCollapsed((v) => !v)}
                  className="text-sm text-slate-400 hover:text-slate-600"
                >
                  {taskCollapsed ? t('showTask') : t('hideTask')}
                </button>
              )}
            </div>

            {!taskCollapsed && (
              <div className="mt-4 space-y-4 text-sm">
                {/* Situation */}
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('situationLabel')}</p>
                  <p className="text-slate-700">{task.situation}</p>
                </div>

                {/* Task */}
                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">{t('taskLabel')}</p>
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
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-500">{t('instructionsLabel')}</p>
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
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-500">{t('exampleStructureLabel')}</p>
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
                className="mt-5 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
              >
                {t('startWriting')}
              </button>
            )}
          </section>
        )}

        {/* ── Editor ──────────────────────────────────────────────────────── */}
        {phase === 'editor' && task && (
          <section className="rounded-2xl bg-white p-5 shadow-float">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">{t('yourResponse')}</h2>
              <WordCounter count={wordCount} min={minWords} max={maxWords} />
            </div>

            <textarea
              ref={textareaRef}
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('startWritingPlaceholder')}
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
                disabled={!canSubmit || isAnalyzing}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
              >
                {t('submit')}
              </button>
              {!canSubmit && (
                <p className="text-xs text-slate-400">
                  {t('writeAtLeast', { min: minWords, remaining: minWords - wordCount })}
                </p>
              )}
            </div>
          </section>
        )}

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {phase === 'result' && (
          <>
            {/* Overall score — shown once analysis_complete fires; skeleton while streaming */}
            <section className="rounded-2xl bg-white p-5 shadow-float">
              <h2 className="text-base font-semibold text-slate-800">{t('result')}</h2>
              {streamedComplete ? (
                <div className="mt-4 flex items-center gap-4">
                  <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ${scoreColor(streamedComplete.overallScore)}`}
                  >
                    {overallPct}%
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700">{streamedComplete.overallFeedback}</p>
                </div>
              ) : (
                <div className="mt-4 flex animate-pulse items-center gap-4">
                  <div className="h-16 w-16 shrink-0 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 rounded bg-slate-200" />
                    <div className="h-3 w-3/4 rounded bg-slate-200" />
                  </div>
                </div>
              )}
            </section>

            {/* Criteria — each card resolves progressively as SSE events arrive */}
            <section className="rounded-2xl bg-white p-5 shadow-float">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800">{t('detailedFeedback')}</h2>
                {isAnalyzing && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500" />
                    {t('evaluating')}
                  </span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {streamedCriteria['taskAchievement']
                  ? <CriterionCard label={t('taskAchievement')} criterion={streamedCriteria['taskAchievement']} />
                  : <CriterionCardSkeleton label={t('taskAchievement')} />}
                {streamedCriteria['grammarVocabulary']
                  ? <CriterionCard label={t('grammarVocabulary')} criterion={streamedCriteria['grammarVocabulary']} />
                  : <CriterionCardSkeleton label={t('grammarVocabulary')} />}
                {streamedCriteria['coherenceStructure']
                  ? <CriterionCard label={t('coherenceStructure')} criterion={streamedCriteria['coherenceStructure']} />
                  : <CriterionCardSkeleton label={t('coherenceStructure')} />}
                {streamedCriteria['style']
                  ? <CriterionCard label={t('style')} criterion={streamedCriteria['style']} />
                  : <CriterionCardSkeleton label={t('style')} />}
              </div>
              {writingStream.status === 'error' && (
                <p className="mt-3 text-xs text-red-500">{t('streamError')}</p>
              )}
            </section>

            {/* ── Your text (inline diff) ──────────────────────────────── */}
            <section className="rounded-2xl bg-white p-5 shadow-float">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800">{t('yourText')}</h2>
                {streamedComplete && (
                  <button
                    type="button"
                    onClick={() => setShowCorrected((v) => !v)}
                    className="text-sm text-slate-400 hover:text-slate-600"
                  >
                    {showCorrected ? t('hideCorrections') : t('showCorrections')}
                  </button>
                )}
              </div>

              <div className="mt-3">
                {streamedComplete && showCorrected ? (
                  <DiffView original={text} corrected={streamedComplete.correctedText} />
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {text}
                  </div>
                )}
              </div>

              {streamedComplete && showCorrected && (
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded bg-red-50 border border-red-200" />
                    <span className="line-through text-red-600">{t('legendRemoved')}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded bg-amber-50 border border-amber-200" />
                    <span className="underline decoration-amber-400 decoration-2 text-amber-700">{t('legendAdded')}</span>
                  </span>
                </div>
              )}

              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    writingStream.cancel();
                    setPhase('editor');
                    setStreamedCriteria({});
                    setStreamedComplete(null);
                    setShowCorrected(false);
                    setError(null);
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  {t('editResubmit')}
                </button>
                <button
                  type="button"
                  onClick={fetchTask}
                  disabled={loadingTask}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  {t('tryAnotherTask')}
                </button>
              </div>
            </section>
          </>
        )}

      </div>
    </LabFrame>
  );
}
