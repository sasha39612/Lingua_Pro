'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LabFrame } from '@/components/lab-frame';
import { AuthUser } from '@/lib/types';
import { useAppStore } from '@/store/app-store';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);
  const [status, setStatus] = useState('Please login to access learning tasks.');
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
        setStatus(data.error ?? 'Login failed');
        return;
      }
      setUser(data.user as AuthUser);
      router.push('/dashboard');
    } catch {
      setStatus('Login failed — please try again');
    } finally {
      setIsPending(false);
    }
  };

  const demoLogin = async (type: 'student' | 'admin') => {
    setIsPending(true);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? 'Demo login failed');
        return;
      }
      setUser(data.user as AuthUser);
      router.push('/dashboard');
    } catch {
      setStatus('Demo login failed — please try again');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <LabFrame>
      <section className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-float">
        <h1 className="text-2xl font-bold">Login</h1>
        <p className="mt-2 text-sm text-slate-600">Use your Lingua Pro account to continue.</p>
        <p className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">{status}</p>

        <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            {...form.register('email')}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            {...form.register('password')}
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-teal-700 px-4 py-2 font-medium text-white"
            disabled={isPending}
          >
            {isPending ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Temporary Access</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => demoLogin('student')}
              disabled={isPending}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Demo User
            </button>
            <button
              type="button"
              onClick={() => demoLogin('admin')}
              disabled={isPending}
              className="flex-1 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Demo Admin
            </button>
          </div>
        </div>
      </section>
    </LabFrame>
  );
}
