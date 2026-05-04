'use client';

import { useCallback, useRef, useState } from 'react';
import { LabFrame } from '@/components/lab-frame';
import { SelectDropdown } from '@/components/select-dropdown';
import { useAppStore } from '@/store/app-store';
import { useAiStream } from '@/lib/use-ai-stream';
import { useTranslations } from 'next-intl';

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

// ── SSE event types ───────────────────────────────────────────────────────────

type ListeningStreamEvent =
  | { event: 'task_ready'; data: { taskId: number; passage: string; questions: ListeningQuestion[] }; requestId?: string }
  | { event: 'audio_ready'; data: { taskId: number; audioBase64: string; mimeType: string }; requestId?: string }
  | { event: 'audio_unavailable'; data: { taskId: number }; requestId?: string }
  | { event: 'error'; data?: { message?: string }; requestId?: string };

// 'generating' → spinner; 'synthesizing' → questions visible + audio bar; 'ready' → full; 'no_audio' → no audio banner
type StreamPhase = 'idle' | 'generating' | 'synthesizing' | 'ready' | 'no_audio';

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

// TFNG_OPTIONS are built inside the component to support translations

// ── Component ────────────────────────────────────────────────────────────────

export function ListeningPage() {
  const t = useTranslations('listening');
  const language = useAppStore((s) => s.language);
  const level = useAppStore((s) => s.level);
  const user = useAppStore((s) => s.user);
  const taskTopic = useAppStore((s) => s.taskTopic);
  const TFNG_OPTIONS = [
    { label: t('true'), value: 'T' },
    { label: t('false'), value: 'F' },
    { label: t('notGiven'), value: 'NG' },
  ];

  // ── Two-phase streaming state ──────────────────────────────────────────────
  const [streamPhase, setStreamPhase] = useState<StreamPhase>('idle');
  const [taskId, setTaskId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<ListeningQuestion[]>([]);
  const [audioSrcState, setAudioSrcState] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Array<number | string | null>>([]);
  const [result, setResult] = useState<AnswersResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [playsUsed, setPlaysUsed] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);
  const resultRef = useRef<AnswersResult | null>(null);

  const [passage, setPassage] = useState<string | null>(null);
  const [showPassage, setShowPassage] = useState(false);

  const isNewFormat = questions.some((q) => 'difficulty' in q && q.difficulty !== undefined);

  // ── Stream hook ─────────────────────────────────────────────────────────────

  const listeningStream = useAiStream<ListeningStreamEvent>({
    url: '/api/audio/listening-task/stream',
    method: 'POST',
    onEvent: useCallback((ev: ListeningStreamEvent) => {
      if (ev.event === 'task_ready') {
        setTaskId(ev.data.taskId);
        setQuestions(ev.data.questions);
        setSelectedAnswers(new Array(ev.data.questions.length).fill(null));
        setStreamPhase('synthesizing');
        if (!resultRef.current) {
          setPassage(ev.data?.passage ?? null);
        }
      } else if (ev.event === 'audio_ready') {
        if (audioBlobUrlRef.current) URL.revokeObjectURL(audioBlobUrlRef.current);
        const binary = atob(ev.data.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: ev.data.mimeType });
        const src = URL.createObjectURL(blob);
        audioBlobUrlRef.current = src;
        setAudioSrcState(src);
        setStreamPhase('ready');
      } else if (ev.event === 'audio_unavailable') {
        setStreamPhase('no_audio');
      } else if (ev.event === 'error') {
        setTaskError(t('failedToGenerate'));
        setStreamPhase('idle');
      }
    }, [t]),
    onError: useCallback(() => {
      setTaskError(t('connectionError'));
      setStreamPhase('idle');
    }, [t]),
  });

  const fetchTask = useCallback(() => {
    if (!user) {
      setTaskError(t('authError'));
      return;
    }
    listeningStream.cancel();
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }
    setStreamPhase('generating');
    setTaskError(null);
    setTaskId(null);
    setQuestions([]);
    setAudioSrcState(null);
    setSelectedAnswers([]);
    setResult(null);
    setSubmitError(null);
    setPlaysUsed(0);
    setAudioError(null);
    setPassage(null);
    setShowPassage(false);
    resultRef.current = null;
    listeningStream.start({ language, level, userId: user.id, ...(taskTopic ? { topic: taskTopic } : {}) });
  }, [language, level, user, listeningStream, taskTopic, t]);

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
    if (!taskId || !user || !allAnswered) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/audio/listening-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          answers: selectedAnswers,
          userId: user.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Failed to submit answers');
      }
      const answersResult = data as AnswersResult;
      setResult(answersResult);
      resultRef.current = answersResult;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit answers.');
    } finally {
      setSubmitting(false);
    }
  };

  const scorePercent = result ? Math.round(result.score * 100) : null;
  const hasQuestions = questions.length > 0;
  const loadingTask = streamPhase === 'generating';
  const isStreaming = listeningStream.status === 'streaming';

  return (
    <LabFrame>
      <div className="mx-auto max-w-5xl space-y-5">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white p-5 shadow-float">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="mt-1 text-sm text-slate-600">{language} · {level}</p>

          {streamPhase === 'idle' && (
            <button
              type="button"
              onClick={fetchTask}
              className="mt-4 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {t('play')}
            </button>
          )}

          {/* Phase 1: generating passage */}
          {streamPhase === 'generating' && (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              {t('generatingPassage')}
            </div>
          )}

          {taskError && <p className="mt-3 text-sm text-red-600">{taskError}</p>}

          {/* Phase 2: questions visible, audio still synthesizing */}
          {streamPhase === 'synthesizing' && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-slate-500">
                {t('passageReadySynthesizing')}
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
                <span className="text-sm text-slate-500">{t('synthesizingAudio')}</span>
              </div>
            </div>
          )}

          {/* Audio ready — play button */}
          {streamPhase === 'ready' && audioSrcState && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-slate-500">
                {isNewFormat
                  ? t('listenCarefully', { maxPlays: MAX_PLAYS, count: questions.length })
                  : t('listenAndAnswer')}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (playsUsed < MAX_PLAYS) {
                      audioRef.current?.play().catch(() => {
                        setAudioError(t('audioPlaybackError'));
                      });
                    }
                  }}
                  disabled={playsUsed >= MAX_PLAYS}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-teal-600">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                  </svg>
                  {playsUsed >= MAX_PLAYS
                    ? t('audioUsed', { max: MAX_PLAYS })
                    : t('playAudio', { used: playsUsed, max: MAX_PLAYS })}
                </button>
                {playsUsed >= MAX_PLAYS && (
                  <p className="text-xs text-amber-600">{t('playLimitReached')}</p>
                )}
              </div>
              <audio
                ref={audioRef}
                key={taskId ?? undefined}
                src={audioSrcState}
                onPlay={() => setPlaysUsed((p) => p + 1)}
                onError={() => setAudioError(t('audioPlaybackError'))}
                className="hidden"
              />
              {audioError && (
                <p className="mt-2 text-xs text-red-500">{audioError}</p>
              )}
            </div>
          )}

          {/* Audio unavailable */}
          {streamPhase === 'no_audio' && (
            <p className="mt-4 text-sm text-amber-600">
              {t('audioUnavailable')}
            </p>
          )}
        </section>

        {/* ── Questions ───────────────────────────────────────────────────── */}
        {hasQuestions && (
          <section className="space-y-4">
            {questions.map((q) => {
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
                    <div className={`${result ? 'pointer-events-none opacity-70' : ''} ${
                      qResult
                        ? qResult.correct
                          ? 'rounded-xl ring-2 ring-teal-500'
                          : 'rounded-xl ring-2 ring-red-400'
                        : ''
                    }`}>
                      <SelectDropdown
                        value={typeof chosen === 'number' ? String(chosen) : ''}
                        options={[
                          { value: '', label: t('selectAnswer') },
                          ...q.options.map((option, optIdx) => ({
                            value: String(optIdx),
                            label: `${OPTION_LABELS[optIdx]}. ${option}`,
                          })),
                        ]}
                        onChange={(v) => { if (v !== '') handleSelectAnswer(q.index, Number(v)); }}
                      />
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
                        ? t('correct', { points: qResult.points })
                        : (() => {
                            const ca = qResult.correctAnswer;
                            if (qType === 'multiple_choice' || qType === 'paraphrase' || qType === 'short_answer') {
                              const idx = typeof ca === 'number' ? ca : parseInt(String(ca), 10);
                              return t('incorrect', { answer: `${OPTION_LABELS[idx]}. ${qResult.correctOptionText ?? ''}` });
                            }
                            if (qType === 'true_false_ng') {
                              const tfngMap: Record<string, string> = { T: t('true'), F: t('false'), NG: t('notGiven') };
                              return t('incorrect', { answer: tfngMap[String(ca)] ?? String(ca) });
                            }
                            return t('incorrect', { answer: String(ca) });
                          })()}
                    </p>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* ── Submit ───────────────────────────────────────────────────────── */}
        {hasQuestions && !result && (
          <section className="rounded-2xl bg-white p-5 shadow-float">
            {submitError && <p className="mb-3 text-sm text-red-600">{submitError}</p>}

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!allAnswered || submitting || isStreaming}
                className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40"
              >
                {submitting ? t('submitting') : t('submitAnswers')}
              </button>
              {!allAnswered && (
                <p className="text-xs text-slate-500">
                  {t('answerAll', { count: questions.length })}
                </p>
              )}
            </div>
          </section>
        )}

        {/* ── Result ───────────────────────────────────────────────────────── */}
        {result && (
          <section className="rounded-2xl bg-white p-5 shadow-float">
            <h2 className="text-lg font-semibold">{t('result')}</h2>

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
                      {t('resultSummary', { correct: result.correct, total: result.total })}
                    </p>
                    {result.cefrLevel && (
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {t('comprehensionLevel')}{' '}
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
                    {t('resultSummaryOld', { correct: result.correct, total: result.total })}{' '}
                    {scorePercent === 100
                      ? t('perfectScore')
                      : scorePercent! >= 60
                        ? t('goodEffort')
                        : t('keepPractising')}
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={fetchTask}
              disabled={isStreaming}
              className="mt-4 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40"
            >
              {t('nextTask')}
            </button>
          </section>
        )}

        {/* ── Passage reveal ──────────────────────────────────────────────── */}
        {result && passage != null && (
          <section className="rounded-2xl bg-white p-5 shadow-float">
            <button
              type="button"
              onClick={() => setShowPassage((v) => !v)}
              aria-expanded={showPassage}
              aria-controls="listening-passage"
              aria-label={showPassage ? t('hidePassage') : t('showPassage')}
              className="flex w-full items-center justify-between text-left"
            >
              <h2 className="text-base font-semibold text-slate-800">
                {t('passageTitle')}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500" aria-hidden="true">
                  {showPassage ? t('hidePassage') : t('showPassage')}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`h-4 w-4 text-slate-400 transition-transform ${showPassage ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                >
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </div>
            </button>

            {showPassage && (
              passage.trim() ? (
                <p
                  id="listening-passage"
                  className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700"
                >
                  {passage}
                </p>
              ) : (
                <p id="listening-passage" className="mt-3 text-sm italic text-slate-400">
                  {t('noPassageAvailable')}
                </p>
              )
            )}
          </section>
        )}

      </div>
    </LabFrame>
  );
}
