'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

const schema = z.object({
  message: z.string().min(10).max(2000),
  mathAnswer: z.string().min(1),
  website: z.string().max(0),
});

type FormValues = z.infer<typeof schema>;

export function ContactForm() {
  const t = useTranslations('contact');
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const { a, b } = useMemo(() => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    return { a, b };
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { message: '', mathAnswer: '', website: '' },
  });

  const onSubmit = async (values: FormValues) => {
    if (values.mathAnswer.trim() !== String(a + b)) {
      form.setError('mathAnswer', { message: t('mathError') });
      return;
    }

    setIsPending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: values.message, honeypot: values.website }),
      });
      if (!res.ok) {
        setStatus('error');
        return;
      }
      setStatus('success');
      form.reset();
    } catch {
      setStatus('error');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-float">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-2 text-sm text-slate-600">{t('subtitle')}</p>

      {status === 'success' && (
        <p className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {t('successMessage')}
        </p>
      )}
      {status === 'error' && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {t('errorMessage')}
        </p>
      )}

      <form className="mt-4 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        {/* Honeypot — hidden from humans, filled by bots */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute opacity-0 -z-10 h-0 w-0 pointer-events-none"
          {...form.register('website')}
        />

        <div>
          <textarea
            placeholder={t('messagePlaceholder')}
            rows={6}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
            {...form.register('message')}
          />
          {form.formState.errors.message && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.message.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            {t('mathLabel', { a, b })}
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder={t('mathPlaceholder')}
            className="mt-1 w-32 rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            {...form.register('mathAnswer')}
          />
          {form.formState.errors.mathAnswer && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.mathAnswer.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-teal-700 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {isPending ? t('submittingButton') : t('submitButton')}
        </button>
      </form>
    </section>
  );
}
