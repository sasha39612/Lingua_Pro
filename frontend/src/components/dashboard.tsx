'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppLanguage, LearningTask, TextResult } from '@/lib/types';
import { AudioRecorder } from '@/components/audio-recorder';
import { StreamedFeedback } from '@/components/streamed-feedback';
import { StatsChart } from '@/components/stats-chart';
import { useAppStore } from '@/store/app-store';
import {
  useCheckTextMutation,
  useLoginMutation,
  useMeQuery,
  useRegisterMutation,
  useTasksQuery,
} from '@/lib/graphql-hooks';
import { graphqlRequest } from '@/lib/graphql-client';
import { TextsData, TextsVariables } from '@/lib/graphql-types';

const LANGUAGES: AppLanguage[] = ['English', 'German', 'Albanian', 'Polish'];

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const textSchema = z.object({
  text: z.string().min(4, 'Please enter at least 4 characters'),
  level: z.string().min(1),
  skill: z.string().min(1),
});

type AuthFormValues = z.infer<typeof authSchema>;
type TextFormValues = z.infer<typeof textSchema>;

export function Dashboard() {
  const token = useAppStore((s) => s.token);
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const recentResults = useAppStore((s) => s.recentResults);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setToken = useAppStore((s) => s.setToken);
  const setUser = useAppStore((s) => s.setUser);
  const addResult = useAppStore((s) => s.addResult);
  const logout = useAppStore((s) => s.logout);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [feedbackSource, setFeedbackSource] = useState('');
  const [taskInput, setTaskInput] = useState<{ level: string; skill: string } | null>(null);
  const [status, setStatus] = useState<string>('Use API Gateway-powered actions below.');

  const registerMutation = useRegisterMutation();
  const loginMutation = useLoginMutation();
  const checkTextMutation = useCheckTextMutation();

  const meQuery = useMeQuery({ enabled: Boolean(token), token });
  const tasksQuery = useTasksQuery({
    enabled: Boolean(token && taskInput),
    variables: {
      language,
      level: taskInput?.level ?? 'A2',
      skill: taskInput?.skill ?? 'reading',
    },
    token,
  });

  const authForm = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: '', password: '' },
  });

  const textForm = useForm<TextFormValues>({
    resolver: zodResolver(textSchema),
    defaultValues: { text: '', level: 'A2', skill: 'reading' },
  });

  const scoreValues = useMemo(() => {
    return recentResults
      .map((r) => Number(r.textScore ?? 0))
      .filter((n) => !Number.isNaN(n))
      .slice(0, 8)
      .reverse();
  }, [recentResults]);

  const handleAuthSubmit = async (values: AuthFormValues) => {
    try {
      const variables =
        mode === 'register'
          ? { email: values.email, password: values.password, language }
          : { email: values.email, password: values.password };

      const payload =
        mode === 'register'
          ? (await registerMutation.mutateAsync({ variables })).register
          : (await loginMutation.mutateAsync({ variables })).login;
      if (!payload?.token || !payload?.user) {
        setStatus('Authentication succeeded but no user payload was returned.');
        return;
      }

      setToken(payload.token);
      setUser(payload.user);
      setStatus(`Authenticated as ${payload.user.email}.`);

      const textResults = await graphqlRequest<TextsData, TextsVariables>({
        operationName: 'Texts',
        variables: { userId: payload.user.id },
        token: payload.token,
      });
      const records: TextResult[] = textResults.texts ?? [];
      records.slice(0, 6).forEach((record) => addResult(record));
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  const handleTextSubmit = async (values: TextFormValues) => {
    if (!token || !user) {
      setStatus('Login is required to submit text for analysis.');
      return;
    }

    try {
      const result = await checkTextMutation.mutateAsync({
        variables: {
          input: {
            userId: user.id,
            language,
            text: values.text,
          },
        },
        token,
      });

      const record: TextResult | undefined = result.checkText;
      if (!record) {
        setStatus('No analysis data was returned.');
        return;
      }

      addResult(record);
      setFeedbackSource(record.feedback ?? values.text);
      setStatus('Text analyzed successfully via API Gateway.');
      setTaskInput({ level: values.level, skill: values.skill });
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : 'Text analysis failed');
    }
  };

  const taskItems: LearningTask[] = tasksQuery.data?.tasks ?? [];

  return (
    <main className="mx-auto max-w-6xl p-4 pb-10 sm:p-6 lg:p-10">
      <section className="reveal glass rounded-3xl p-6 shadow-float sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.2em] text-teal-700">
              Lingua Pro UI
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Gateway-connected student workspace</h1>
            <p className="mt-3 max-w-xl text-sm text-slate-700 sm:text-base">
              GraphQL operations run through API Gateway only. Practice writing, review streamed AI
              feedback, monitor your progress, and prepare speaking tasks.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="language" className="text-sm font-medium text-slate-700">
              Language
            </label>
            <select
              id="language"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={language}
              onChange={(e) => setLanguage(e.target.value as AppLanguage)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-slate-900 px-4 py-3 text-sm text-slate-100">{status}</p>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="reveal rounded-2xl bg-white p-5 shadow-float">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Account</h2>
            <button
              type="button"
              onClick={() => setMode((prev) => (prev === 'login' ? 'register' : 'login'))}
              className="rounded-full border border-teal-300 px-3 py-1 text-xs font-medium text-teal-700"
            >
              Switch to {mode === 'login' ? 'register' : 'login'}
            </button>
          </div>
          <form className="mt-4 space-y-3" onSubmit={authForm.handleSubmit(handleAuthSubmit)}>
            <input
              type="email"
              placeholder="Email"
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              {...authForm.register('email')}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              {...authForm.register('password')}
            />
            <button
              type="submit"
              disabled={registerMutation.isPending || loginMutation.isPending}
              className="w-full rounded-xl bg-teal-700 px-4 py-2 font-medium text-white disabled:opacity-60"
            >
              {mode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>
          <div className="mt-4 rounded-xl border border-slate-200 p-3 text-sm">
            <p>
              Token status: <strong>{token ? 'active' : 'missing'}</strong>
            </p>
            <p>
              User: <strong>{meQuery.data?.me?.email ?? user?.email ?? 'guest'}</strong>
            </p>
            <button
              type="button"
              onClick={logout}
              className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white"
            >
              Logout
            </button>
          </div>
        </article>

        <article className="reveal rounded-2xl bg-white p-5 shadow-float">
          <h2 className="text-lg font-semibold">Writing Analysis</h2>
          <form className="mt-4 space-y-3" onSubmit={textForm.handleSubmit(handleTextSubmit)}>
            <textarea
              placeholder="Write your sentence or paragraph"
              rows={4}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              {...textForm.register('text')}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Level (A1-C2)"
                className="rounded-xl border border-slate-300 px-3 py-2"
                {...textForm.register('level')}
              />
              <input
                placeholder="Skill"
                className="rounded-xl border border-slate-300 px-3 py-2"
                {...textForm.register('skill')}
              />
            </div>
            <button
              type="submit"
              disabled={checkTextMutation.isPending || tasksQuery.isLoading}
              className="w-full rounded-xl bg-amber-500 px-4 py-2 font-semibold text-slate-900 disabled:opacity-60"
            >
              Analyze Text
            </button>
          </form>
          {feedbackSource ? (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Real-time feedback stream
              </h3>
              <StreamedFeedback text={feedbackSource} language={language} />
            </div>
          ) : null}
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <AudioRecorder />
        <StatsChart values={scoreValues} />
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-float">
        <h2 className="text-lg font-semibold">Suggested Tasks</h2>
        {taskItems.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Submit text first to load tasks from GraphQL.</p>
        ) : (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {taskItems.slice(0, 6).map((task) => (
              <li key={task.id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
                  {task.language} • {task.level} • {task.skill}
                </p>
                <p className="mt-1 text-sm text-slate-800">{task.prompt}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
