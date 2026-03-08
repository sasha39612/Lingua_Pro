'use client';

import { useState } from 'react';
import { AudioRecorder } from '@/components/audio-recorder';
import { LabFrame } from '@/components/lab-frame';
import { StreamedFeedback } from '@/components/streamed-feedback';
import { useAppStore } from '@/store/app-store';

export function SpeakingPage() {
  const language = useAppStore((s) => s.language);
  const addAudioScore = useAppStore((s) => s.addAudioScore);
  const [promptText, setPromptText] = useState('Describe your day in 4 to 5 sentences.');
  const [feedbackText, setFeedbackText] = useState('');

  return (
    <LabFrame>
      <div className="mx-auto max-w-5xl">
      <section className="rounded-2xl bg-white p-5 shadow-float">
        <h1 className="text-2xl font-bold">Speaking</h1>
        <p className="mt-2 text-sm text-slate-600">Record + playback + AI speaking feedback.</p>
      </section>

      <section className="mt-5">
        <AudioRecorder />
      </section>

      <section className="mt-5 rounded-2xl bg-white p-5 shadow-float">
        <h2 className="text-lg font-semibold">Prompt</h2>
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2"
          rows={4}
        />
        <button
          type="button"
          className="mt-3 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white"
          onClick={() => {
            const score = 0.6 + Math.random() * 0.35;
            addAudioScore(Number(score.toFixed(2)));
            setFeedbackText(`Speaking assessment (${language}): ${promptText}`);
          }}
        >
          Generate AI feedback
        </button>
      </section>

      {feedbackText ? (
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-float">
          <h2 className="text-lg font-semibold">AI Feedback</h2>
          <div className="mt-3">
            <StreamedFeedback text={feedbackText} language={language} />
          </div>
        </section>
      ) : null}
      </div>
    </LabFrame>
  );
}
