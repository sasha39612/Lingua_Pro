'use client';

import { useMemo, useState } from 'react';
import { AudioRecorder } from '@/components/audio-recorder';
import { LabFrame } from '@/components/lab-frame';
import { useAppStore } from '@/store/app-store';
import {
  MOCK_FEEDBACK,
  MOCK_GENERATED_TEXT,
  STAT_LABELS,
  type FeedbackResult,
  type SpeakingMistake,
} from '@/lib/speaking-mocks';

function speakWord(word: string) {
  if (typeof window === 'undefined') return;
  const utterance = new SpeechSynthesisUtterance(word);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function renderSpokenText(spokenText: string, mistakes: SpeakingMistake[], generatedText: string) {
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
                className="inline-block mr-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700"
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
          <span className="text-xs font-medium text-orange-500">{STAT_LABELS.extra}:</span>
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
  const language = useAppStore((s) => s.language);
  const level = useAppStore((s) => s.level);

  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<FeedbackResult | null>(null);

  const handleGenerateText = () => {
    setIsGenerating(true);
    setGeneratedText('');
    setTimeout(() => {
      setGeneratedText(MOCK_GENERATED_TEXT);
      setIsGenerating(false);
    }, 800);
  };

  const handleAnalyze = () => {
    if (!recordedBlob || !generatedText) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setFeedbackResult(MOCK_FEEDBACK);
      setIsAnalyzing(false);
    }, 1000);
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
          <h1 className="text-2xl font-bold">Speaking</h1>
          <p className="mt-2 text-sm text-slate-600">
            Read the generated text aloud, record yourself, and get pronunciation feedback.
          </p>
        </section>

        {/* Block 2: Generated text */}
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-float">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Generated Text</h2>
            <div className="flex gap-2">
              <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
                {language}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {level}
              </span>
            </div>
          </div>
          <div className="mt-3 min-h-[80px] rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            {generatedText || (
              <span className="text-slate-400">
                Click &quot;Generate text&quot; to get a passage to read aloud.
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleGenerateText}
            disabled={isGenerating}
            className="mt-3 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isGenerating ? 'Generating…' : 'Generate text'}
          </button>
        </section>

        {/* Block 3: Record + playback */}
        <section className="mt-5">
          {recordedBlob ? (
            <div className="mb-2 flex justify-end">
              <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Recording ready
              </span>
            </div>
          ) : null}
          <AudioRecorder
            onRecordingComplete={(blob) => setRecordedBlob(blob)}
            onSendToReview={handleAnalyze}
            disabled={!generatedText}
          />
        </section>

        {/* Block 4: Pronunciation Feedback */}
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-float">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Pronunciation Feedback</h2>
            {stats ? (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-teal-700">{stats.score}</span>
                  <span className="text-sm text-slate-400">/ 100</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-600">
                    {STAT_LABELS.pronunciation}
                    <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 font-bold">
                      {stats.pronunciation}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 font-medium text-orange-600">
                    {STAT_LABELS.extra}
                    <span className="ml-1 rounded-full bg-orange-100 px-1.5 py-0.5 font-bold">
                      {stats.extra}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-600">
                    {STAT_LABELS.missed}
                    <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 font-bold">
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
            className="mt-3 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isAnalyzing ? 'Analyzing…' : 'Analyze pronunciation'}
          </button>
          {!canAnalyze && !feedbackResult ? (
            <p className="mt-2 text-xs text-slate-400">
              Generate a text and record yourself to enable analysis.
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
                        You said: <span className="text-red-500">{m.spoken}</span>
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{m.feedback}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakWord(m.expected)}
                      title={`Listen to "${m.expected}"`}
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
            <h2 className="text-lg font-semibold">Mistakes Details</h2>
            <p className="mt-1 text-xs text-slate-400">
              <span className="text-red-400">Red</span> — mispronounced (IPA below) &nbsp;·&nbsp;
              <span className="text-amber-500">Amber box</span> — missed &nbsp;·&nbsp;
              <span className="text-orange-400 line-through">Strikethrough</span> — added
            </p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
              {renderSpokenText(feedbackResult.spokenText, feedbackResult.mistakes, generatedText)}
            </div>
          </section>
        ) : null}
      </div>
    </LabFrame>
  );
}
