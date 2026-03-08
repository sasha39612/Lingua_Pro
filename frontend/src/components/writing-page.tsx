'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LabFrame } from '@/components/lab-frame';
import { StreamedFeedback } from '@/components/streamed-feedback';
import { useCheckTextMutation } from '@/lib/graphql-hooks';
import { useAppStore } from '@/store/app-store';

const writeSchema = z.object({
  text: z.string().min(6),
});

type WritingValues = z.infer<typeof writeSchema>;

export function WritingPage() {
  const token = useAppStore((s) => s.token);
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const addResult = useAppStore((s) => s.addResult);

  const [status, setStatus] = useState('Submit text for AI corrections.');
  const [feedbackText, setFeedbackText] = useState('');

  const checkTextMutation = useCheckTextMutation();

  const writingForm = useForm<WritingValues>({
    resolver: zodResolver(writeSchema),
    defaultValues: { text: '' },
  });

  const onWrite = async (values: WritingValues) => {
    if (!token || !user) {
      setStatus('Please login first.');
      return;
    }

    try {
      const data = await checkTextMutation.mutateAsync({
        token,
        variables: {
          input: {
            userId: user.id,
            language,
            text: values.text,
          },
        },
      });
      addResult(data.checkText);
      setFeedbackText(data.checkText.feedback || values.text);
      setStatus('AI correction received.');
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : 'AI correction failed');
    }
  };

  return (
    <LabFrame>
      <div className="mx-auto max-w-5xl">
      <section className="rounded-2xl bg-white p-5 shadow-float">
        <h1 className="text-2xl font-bold">Writing</h1>
        <p className="mt-2 text-sm text-slate-600">Text editor to AI corrections via API Gateway.</p>
        <p className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">{status}</p>
      </section>

      <section className="mt-5">
        <form onSubmit={writingForm.handleSubmit(onWrite)} className="rounded-2xl bg-white p-5 shadow-float">
          <h2 className="text-lg font-semibold">Editor</h2>
          <textarea
            rows={7}
            placeholder="Write your paragraph here"
            className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2"
            {...writingForm.register('text')}
          />
          <button
            className="mt-3 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900"
            type="submit"
          >
            Get Corrections
          </button>
        </form>
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
