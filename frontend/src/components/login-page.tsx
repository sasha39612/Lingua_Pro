'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LabFrame } from '@/components/lab-frame';
import { useLoginMutation } from '@/lib/graphql-hooks';
import { AuthUser } from '@/lib/types';
import { useAppStore } from '@/store/app-store';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const router = useRouter();
  const setToken = useAppStore((s) => s.setToken);
  const setUser = useAppStore((s) => s.setUser);
  const loginMutation = useLoginMutation();
  const [status, setStatus] = useState('Please login to access learning tasks.');

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      const data = await loginMutation.mutateAsync({ variables: values });
      setToken(data.login.token);
      setUser(data.login.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const loginTemporarily = (user: AuthUser, tokenPrefix: string) => {
    setUser(user);
    setToken(`${tokenPrefix}-${Date.now()}`);
    setStatus(`Temporary login as ${user.role}: ${user.email}`);
    router.push('/dashboard');
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
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Temporary Access</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() =>
                loginTemporarily(
                  {
                    id: 'demo-student',
                    email: 'demo.student@lingua.pro',
                    role: 'student',
                    language: 'English',
                  },
                  'temp-student',
                )
              }
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
            >
              Demo User
            </button>
            <button
              type="button"
              onClick={() =>
                loginTemporarily(
                  {
                    id: 'demo-admin',
                    email: 'demo.admin@lingua.pro',
                    role: 'admin',
                    language: 'English',
                  },
                  'temp-admin',
                )
              }
              className="flex-1 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-medium text-white"
            >
              Demo Admin
            </button>
          </div>
        </div>
      </section>
    </LabFrame>
  );
}
