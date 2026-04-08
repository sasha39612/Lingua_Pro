'use client';

import { LabFrame } from '@/components/lab-frame';
import { SelectDropdown } from '@/components/select-dropdown';
import { useAppStore } from '@/store/app-store';
import type { AppLanguage } from '@/lib/types';

const LEVEL_OPTIONS = [
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'C1', label: 'C1' },
  { value: 'C2', label: 'C2' },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const LANGUAGE_OPTIONS = [
  { value: 'English', label: 'English' },
  { value: 'German', label: 'German' },
  { value: 'Albanian', label: 'Albanian' },
  { value: 'Polish', label: 'Polish' },
  { value: 'Ukrainian', label: 'Ukrainian' },
];

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
          <SelectDropdown
            label="Level"
            value={level}
            options={LEVEL_OPTIONS}
            onChange={setLevel}
          />
          <SelectDropdown
            label="Theme"
            value={theme}
            options={THEME_OPTIONS}
            onChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
          />
          <SelectDropdown
            label="Language"
            value={language}
            options={LANGUAGE_OPTIONS}
            onChange={(v) => setLanguage(v as AppLanguage)}
          />
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
