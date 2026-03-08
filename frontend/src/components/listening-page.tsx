'use client';

import { useState } from 'react';
import { LabFrame } from '@/components/lab-frame';
import { StreamedFeedback } from '@/components/streamed-feedback';
import { useAppStore } from '@/store/app-store';

const sampleQuestions = [
  {
    id: 'q1',
    prompt: 'What is the speaker planning for tomorrow?',
    options: ['A meeting', 'A trip', 'A lesson', 'A concert'],
  },
  {
    id: 'q2',
    prompt: 'How does the speaker feel at the end?',
    options: ['Confused', 'Excited', 'Tired', 'Neutral'],
  },
];

export function ListeningPage() {
  const language = useAppStore((s) => s.language);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedbackInput, setFeedbackInput] = useState('');

  const summary = sampleQuestions
    .map((q) => `${q.prompt} -> ${answers[q.id] || 'no answer'}`)
    .join(' | ');

  return (
    <LabFrame>
      <div className="mx-auto max-w-5xl">
      <section className="rounded-2xl bg-white p-5 shadow-float">
        <h1 className="text-2xl font-bold">Listening</h1>
        <p className="mt-2 text-sm text-slate-600">
          Audio player + comprehension questions + AI feedback.
        </p>
        <audio controls className="mt-4 w-full">
          <source src="https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav" type="audio/wav" />
        </audio>
      </section>

      <section className="mt-5 rounded-2xl bg-white p-5 shadow-float">
        <h2 className="text-lg font-semibold">Questions</h2>
        <div className="mt-3 space-y-3">
          {sampleQuestions.map((q) => (
            <div key={q.id} className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-medium">{q.prompt}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {q.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: option }))}
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${
                      answers[q.id] === option
                        ? 'border-teal-600 bg-teal-50 text-teal-900'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFeedbackInput(`Listening summary (${language}): ${summary}`)}
          className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white"
        >
          Get AI feedback
        </button>
      </section>

      {feedbackInput ? (
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-float">
          <h2 className="text-lg font-semibold">AI Feedback</h2>
          <div className="mt-3">
            <StreamedFeedback text={feedbackInput} language={language} />
          </div>
        </section>
      ) : null}
      </div>
    </LabFrame>
  );
}
