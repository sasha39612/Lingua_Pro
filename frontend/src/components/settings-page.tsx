'use client';

import { LabFrame } from '@/components/lab-frame';
import { useAppStore } from '@/store/app-store';
import type { AppLanguage } from '@/lib/types';

export function SettingsPage() {
  const user = useAppStore((s) => s.user);
  const level = useAppStore((s) => s.level);
  const theme = useAppStore((s) => s.theme);
  const language = useAppStore((s) => s.language);
  const setLevel = useAppStore((s) => s.setLevel);
  const setTheme = useAppStore((s) => s.setTheme);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const logout = useAppStore((s) => s.logout);

  return (
    <LabFrame>
      <div className="mx-auto max-w-4xl">
      <section className="rounded-2xl bg-white p-5 shadow-float">
        <h1 className="text-2xl font-bold">Profile / Settings</h1>
        <p className="mt-2 text-sm text-slate-600">Manage level, theme, language, and account session.</p>
      </section>

      <section className="mt-5 rounded-2xl bg-white p-5 shadow-float">
        <h2 className="text-lg font-semibold">Learning Settings</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Level</span>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full rounded-xl border px-3 py-2">
              <option>A1</option>
              <option>A2</option>
              <option>B1</option>
              <option>B2</option>
              <option>C1</option>
              <option>C2</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Theme</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
              className="w-full rounded-xl border px-3 py-2"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as AppLanguage)}
              className="w-full rounded-xl border px-3 py-2"
            >
              <option>English</option>
              <option>German</option>
              <option>Albanian</option>
              <option>Polish</option>
              <option>Ukrainian</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mt-5 rounded-2xl bg-white p-5 shadow-float">
        <h2 className="text-lg font-semibold">Account Management</h2>
        <p className="mt-2 text-sm text-slate-600">Signed in as: {user?.email ?? 'guest'}</p>
        <button type="button" onClick={logout} className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
          Logout
        </button>
      </section>
      </div>
    </LabFrame>
  );
}
