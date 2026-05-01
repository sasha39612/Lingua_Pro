'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LabFrame } from '@/components/lab-frame';
import { AuthUser } from '@/lib/types';
import { useAppStore } from '@/store/app-store';
import { useTranslations } from 'next-intl';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const t = useTranslations('login');
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);
  const [status, setStatus] = useState('');
  const [isPending, setIsPending] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginValues) => {
    setIsPending(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? t('loginFailed'));
        return;
      }
      setUser(data.user as AuthUser);
      router.push('/dashboard');
    } catch {
      setStatus(t('loginFailedRetry'));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <LabFrame>
      <section className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-float">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('subtitle')}</p>
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
        >
          {status || t('defaultStatus')}
        </p>

        <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="login-email" className="sr-only">{t('emailPlaceholder')}</label>
            <input
              id="login-email"
              type="email"
              placeholder={t('emailPlaceholder')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              {...form.register('email')}
            />
          </div>
          <div>
            <label htmlFor="login-password" className="sr-only">{t('passwordPlaceholder')}</label>
            <input
              id="login-password"
              type="password"
              placeholder={t('passwordPlaceholder')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              {...form.register('password')}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-teal-700 px-4 py-2 font-medium text-white"
            disabled={isPending}
          >
            {isPending ? t('submittingButton') : t('submitButton')}
          </button>
        </form>

      </section>
    </LabFrame>
  );
}
