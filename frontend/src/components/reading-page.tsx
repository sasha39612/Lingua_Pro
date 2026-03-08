'use client';

import { useMemo, useState } from 'react';
import { LabFrame } from '@/components/lab-frame';
import { useAppStore } from '@/store/app-store';

const passage = `Marta wakes up at 6:30 every weekday. She makes tea, reads a short article,
and then walks to work. On Fridays, she studies English with her friend online for one hour.`;

const questions = [
  { prompt: 'When does Marta wake up?', answer: '6:30' },
  { prompt: 'What does she drink in the morning?', answer: 'tea' },
  { prompt: 'What does she do on Fridays?', answer: 'studies English online' },
];

export function ReadingPage() {
  const [responses, setResponses] = useState<string[]>(['', '', '']);
  const language = useAppStore((s) => s.language);

  const score = useMemo(() => {
    const correct = responses.filter((res, idx) =>
      res.toLowerCase().includes(questions[idx].answer.toLowerCase()),
    ).length;
    return Math.round((correct / questions.length) * 100);
  }, [responses]);

  return (
    <LabFrame>
      <div className="mx-auto max-w-5xl">
      <section className="rounded-2xl bg-white p-5 shadow-float">
        <h1 className="text-2xl font-bold">Reading</h1>
        <p className="mt-2 text-sm text-slate-600">Passage + optional audio + comprehension questions.</p>
        <article className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
          {passage}
        </article>
        <audio controls className="mt-4 w-full">
          <source src="https://www2.cs.uic.edu/~i101/SoundFiles/PinkPanther30.wav" type="audio/wav" />
        </audio>
      </section>

      <section className="mt-5 rounded-2xl bg-white p-5 shadow-float">
        <h2 className="text-lg font-semibold">Questions ({language})</h2>
        <div className="mt-3 space-y-3">
          {questions.map((item, idx) => (
            <div key={item.prompt}>
              <p className="text-sm font-medium">{item.prompt}</p>
              <input
                value={responses[idx]}
                onChange={(e) => {
                  const next = [...responses];
                  next[idx] = e.target.value;
                  setResponses(next);
                }}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Write your answer"
              />
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-900">
          Auto score: <strong>{score}%</strong>
        </p>
      </section>
      </div>
    </LabFrame>
  );
}
