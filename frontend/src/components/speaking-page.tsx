'use client';

import { useCallback, useMemo, useState } from 'react';
import { AudioRecorder } from '@/components/audio-recorder';
import { LabFrame } from '@/components/lab-frame';
import { useAppStore } from '@/store/app-store';
import { useAiStream } from '@/lib/use-ai-stream';
import {
  type FeedbackResult,
  type SpeakingMistake,
} from '@/lib/speaking-mocks';
import { useTranslations } from 'next-intl';

function speakWord(word: string) {
  if (typeof window === 'undefined') return;
  const utterance = new SpeechSynthesisUtterance(word);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function renderSpokenText(spokenText: string, mistakes: SpeakingMistake[], generatedText: string, statAdded: string) {
  const mistakeByExpected = new Map(mistakes.map((m) => [m.expected.toLowerCase(), m]));
  const mistakeSpokenSet = new Set(mistakes.map((m) => m.spoken.toLowerCase()));
  const generatedWordSet = new Set(
    generatedText.split(' ').map((w) => w.replace(/[.,!?;:]/g, '').toLowerCase()),
  );
  const spokenWords = new Set(
    spokenText.split(' ').map((w) => w.replace(/[.,!?;:]/g, '').toLowerCase()),
  );

  const extraWords = spokenText
    .split(' ')
    .filter((w) => {
      const c = w.replace(/[.,!?;:]/g, '').toLowerCase();
      return !generatedWordSet.has(c) && !mistakeSpokenSet.has(c);
    });

  return (
    <div>
      <span className="inline leading-10">
        {generatedText.split(' ').map((word, i) => {
          const clean = word.replace(/[.,!?;:]/g, '').toLowerCase();
          const mistake = mistakeByExpected.get(clean);

          if (mistake) {
            return (
              <span key={i} className="inline-flex flex-col items-center mr-1 align-top">
                <span className="font-medium text-red-500">{mistake.spoken}</span>
                <span className="font-mono text-[10px] leading-none text-red-400 mt-0.5">
                  {mistake.ipa}
                </span>
              </span>
            );
          }

          if (!spokenWords.has(clean)) {
            return (
              <span
                key={i}
                className="inline-block mr-1 rounded-md border border-yellow-300 bg-yellow-50 px-1.5 py-0.5 font-medium text-yellow-700"
              >
                {word}
              </span>
            );
          }

          return <span key={i} className="mr-1">{word}</span>;
        })}
      </span>

      {extraWords.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
          <span className="text-xs font-medium text-orange-500">{statAdded}:</span>
          {extraWords.map((w, i) => (
            <span
              key={i}
              className="rounded-md border border-orange-300 bg-orange-50 px-1.5 py-0.5 text-sm font-medium text-orange-600 line-through"
            >
              {w}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function SpeakingPage() {
  const t = useTranslations('speaking');
  const language = useAppStore((s) => s.language);
  const level = useAppStore((s) => s.level);
  const user = useAppStore((s) => s.user);
  const taskTopic = useAppStore((s) => s.taskTopic);

  const [generatedText, setGeneratedText] = useState('');
  const [focusPhonemes, setFocusPhonemes] = useState<string[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [feedbackResult, setFeedbackResult] = useState<FeedbackResult | null>(null);

  type SpeakingStreamEvent =
    | { event: 'task_generating'; requestId?: string }
    | { event: 'task_ready'; data: Array<{ referenceText?: string; focusPhonemes?: string[] }>; requestId?: string }
    | { event: 'error'; requestId?: string };

  const speakingStream = useAiStream<SpeakingStreamEvent>({
    url: '/api/speaking/task/stream',
    method: 'POST',
    onEvent: useCallback((ev: SpeakingStreamEvent) => {
      if (ev.event === 'task_ready') {
        const first = ev.data[0];
        setGeneratedText(first?.referenceText ?? '');
        setFocusPhonemes(first?.focusPhonemes ?? []);
      }
      // error event: leave generatedText empty — UI shows nothing (same as before)
    }, []),
  });

  const isGenerating = speakingStream.status === 'streaming';

  const handleGenerateText = useCallback(() => {
    speakingStream.cancel();
    setGeneratedText('');
    setFocusPhonemes([]);
    speakingStream.start({ language, level, userId: user?.id, ...(taskTopic ? { topic: taskTopic } : {}) });
  }, [language, level, user, taskTopic, speakingStream]);

  const handleAnalyze = async () => {
    if (!recordedBlob || !generatedText || !user) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      const formData = new FormData();
      formData.append('audio', recordedBlob, 'recording.webm');
      formData.append('language', language);
      formData.append('userId', user.id);
      formData.append('referenceText', generatedText);

      const res = await fetch('/api/audio/analyze', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Analysis failed');
      }

      const mistakes: SpeakingMistake[] = (data.alignment ?? [])
        .filter((a: { type: string }) => a.type === 'mispronounced')
        .map((a: { expected: string; spoken: string | null }) => ({
          word: a.expected,
          expected: a.expected,
          spoken: a.spoken ?? '',
          ipa: `/${a.expected}/`,
          feedback: data.feedback || '',
        }));

      setFeedbackResult({
        score: Math.round((data.pronunciationScore ?? 0) * 100),
        spokenText: data.transcript ?? '',
        ipaSentence: '',
        mistakes,
      });
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const canAnalyze = recordedBlob !== null && generatedText.length > 0;

  const stats = useMemo(() => {
    if (!feedbackResult || !generatedText) return null;
    const mistakeExpectedSet = new Set(feedbackResult.mistakes.map((m) => m.expected.toLowerCase()));
    const mistakeSpokenSet = new Set(feedbackResult.mistakes.map((m) => m.spoken.toLowerCase()));
    const generatedWordSet = new Set(
      generatedText.split(' ').map((w) => w.replace(/[.,!?;:]/g, '').toLowerCase()),
    );
    const spokenWordSet = new Set(
      feedbackResult.spokenText.split(' ').map((w) => w.replace(/[.,!?;:]/g, '').toLowerCase()),
    );
    const extra = feedbackResult.spokenText.split(' ').filter((w) => {
      const c = w.replace(/[.,!?;:]/g, '').toLowerCase();
      return !generatedWordSet.has(c) && !mistakeSpokenSet.has(c);
    }).length;
    const forgotten = generatedText.split(' ').filter((w) => {
      const c = w.replace(/[.,!?;:]/g, '').toLowerCase();
      return !spokenWordSet.has(c) && !mistakeExpectedSet.has(c);
    }).length;
    return { score: feedbackResult.score, pronunciation: feedbackResult.mistakes.length, extra, forgotten };
  }, [feedbackResult, generatedText]);

  return (
    <LabFrame>
      <div className="mx-auto max-w-5xl">
        {/* Block 1: Header */}
        <section className="rounded-2xl bg-white p-5 shadow-float">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="mt-1 text-sm text-slate-600">{language} · {level}</p>
        </section>

        {/* Block 2: Generated text */}
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-float">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('generatedText')}</h2>
          </div>
          <div className="mt-3 min-h-[80px] rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            {generatedText || (
              <span className="text-slate-400">
                {t('clickToGenerate')}
              </span>
            )}
          </div>
          {focusPhonemes.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400">{t('focusSounds')}</span>
              {focusPhonemes.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-teal-50 px-2 py-0.5 font-mono text-xs font-medium text-teal-700"
                >
                  /{p}/
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={handleGenerateText}
            disabled={isGenerating}
            className="mt-3 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {isGenerating ? t('generating') : t('generateText')}
          </button>
        </section>

        {/* Block 3: Record + playback */}
        <section className="mt-5">
          {recordedBlob ? (
            <div className="mb-2 flex justify-end">
              <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                {t('recordingReady')}
              </span>
            </div>
          ) : null}
          <AudioRecorder
            onRecordingComplete={(blob) => setRecordedBlob(blob)}
            onSendToReview={handleAnalyze}
            disabled={!generatedText || !user}
            isAnalyzing={isAnalyzing}
          />
        </section>

        {/* Block 4: Pronunciation Feedback */}
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-float">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t('pronunciationFeedback')}</h2>
            {stats ? (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-teal-700">{stats.score}</span>
                  <span className="text-sm text-slate-400">{t('scoreOf100')}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-600">
                    {t('statPronunciation')}
                    <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 font-bold">
                      {stats.pronunciation}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 font-medium text-orange-600">
                    {t('statAdded')}
                    <span className="ml-1 rounded-full bg-orange-100 px-1.5 py-0.5 font-bold">
                      {stats.extra}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 font-medium text-yellow-600">
                    {t('statMissed')}
                    <span className="ml-1 rounded-full bg-yellow-100 px-1.5 py-0.5 font-bold">
                      {stats.forgotten}
                    </span>
                  </span>
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            className="mt-3 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {isAnalyzing ? t('analyzing') : t('analyzePronunciation')}
          </button>
          {analyzeError ? (
            <p className="mt-2 text-sm text-red-600">{analyzeError}</p>
          ) : null}
          {!canAnalyze && !feedbackResult ? (
            <p className="mt-2 text-xs text-slate-400">
              {t('generateToEnable')}
            </p>
          ) : null}
          {feedbackResult && feedbackResult.mistakes.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {feedbackResult.mistakes.map((m) => (
                <li key={m.word} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-800">{m.expected}</span>
                        <span className="font-mono text-xs text-slate-500">{m.ipa}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {t('youSaid')} <span className="text-red-500">{m.spoken}</span>
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{m.feedback}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakWord(m.expected)}
                      title={t('listenTo', { word: m.expected })}
                      className="shrink-0 rounded-full bg-teal-50 p-2 text-teal-700 hover:bg-teal-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path d="M10.5 3.75a.75.75 0 0 0-1.264-.546L5.203 7H2.667a.75.75 0 0 0-.7.48A6.985 6.985 0 0 0 1.5 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h2.535l4.033 3.796a.75.75 0 0 0 1.264-.546V3.75ZM16.45 5.05a.75.75 0 0 0-1.06 1.061 5.5 5.5 0 0 1 0 7.778.75.75 0 0 0 1.06 1.06 7 7 0 0 0 0-9.899ZM14.329 7.172a.75.75 0 0 0-1.061 1.06 2.5 2.5 0 0 1 0 3.536.75.75 0 0 0 1.06 1.06 4 4 0 0 0 0-5.656Z" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {/* Block 5: Mistakes Details */}
        {feedbackResult ? (
          <section className="mt-5 rounded-2xl bg-white p-5 shadow-float">
            <h2 className="text-lg font-semibold">{t('mistakesDetails')}</h2>
            <p className="mt-1 text-xs text-slate-400">
              {t('legendMispronounced')} &nbsp;·&nbsp;
              {t('legendMissed')} &nbsp;·&nbsp;
              {t('legendAdded')}
            </p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
              {renderSpokenText(feedbackResult.spokenText, feedbackResult.mistakes, generatedText, t('statAdded'))}
            </div>
          </section>
        ) : null}
      </div>
    </LabFrame>
  );
}
