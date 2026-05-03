'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { LabFrame } from '@/components/lab-frame';
import { SelectDropdown } from '@/components/select-dropdown';
import { useAppStore } from '@/store/app-store';
import { useTranslations } from 'next-intl';
import type { AppLanguage, CEFRLevel } from '@/lib/types';
import { useUpdateLevelMutation } from '@/lib/graphql-hooks';
import { VALID_LOCALES, type Locale } from '@/i18n/locales';

const LEVEL_OPTIONS = [
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'C1', label: 'C1' },
  { value: 'C2', label: 'C2' },
];

const LANGUAGE_OPTIONS = [
  { value: 'English', label: 'English' },
  { value: 'German', label: 'German' },
  { value: 'Albanian', label: 'Albanian' },
  { value: 'Polish', label: 'Polish' },
  { value: 'Ukrainian', label: 'Ukrainian' },
];

const TOPIC_OPTIONS = [
  { value: '',               label: 'topicAny' as const },
  { value: 'Technology',     label: 'Technology' },
  { value: 'Sports',         label: 'Sports' },
  { value: 'Science',        label: 'Science' },
  { value: 'History',        label: 'History' },
  { value: 'Travel',         label: 'Travel' },
  { value: 'Food & Cooking', label: 'Food & Cooking' },
  { value: 'Business',       label: 'Business' },
  { value: 'Arts & Culture', label: 'Arts & Culture' },
  { value: 'Health',         label: 'Health' },
  { value: 'Nature',         label: 'Nature' },
];

const UI_LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'sq', label: 'Shqip' },
  { value: 'pl', label: 'Polski' },
  { value: 'uk', label: 'Українська' },
];

export function SettingsPage() {
  const t = useTranslations('settings');
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAppStore((s) => s.user);
  const level = useAppStore((s) => s.level);
  const theme = useAppStore((s) => s.theme);
  const language = useAppStore((s) => s.language);
  const uiLocale = useAppStore((s) => s.uiLocale);
  const taskTopic = useAppStore((s) => s.taskTopic);
  const setLevel = useAppStore((s) => s.setLevel);
  const setTheme = useAppStore((s) => s.setTheme);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setUiLocale = useAppStore((s) => s.setUiLocale);
  const setTaskTopic = useAppStore((s) => s.setTaskTopic);
  const logout = useAppStore((s) => s.logout);
  const updateLevelMutation = useUpdateLevelMutation();

  const themeOptions = [
    { value: 'light', label: t('themeLight') },
    { value: 'dark', label: t('themeDark') },
    { value: 'system', label: t('themeSystem') },
  ];

  const handleLocaleChange = (locale: string) => {
    const validLocale = VALID_LOCALES.includes(locale as Locale) ? (locale as Locale) : 'en';
    document.cookie = `NEXT_LOCALE=${validLocale}; path=/; max-age=31536000; SameSite=Lax`;
    setUiLocale(validLocale);
    router.refresh();
  };

  return (
    <LabFrame>
      <div className="mx-auto max-w-4xl">
      <section className="rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-float">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('subtitle')}</p>
      </section>

      <section className="mt-5 rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-float">
        <h2 className="text-lg font-semibold">{t('learningSettings')}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <SelectDropdown
            label={t('levelLabel')}
            value={level}
            options={LEVEL_OPTIONS}
            disabled={updateLevelMutation.isPending}
            onChange={(v) => {
              const newLevel = v as CEFRLevel;
              const previous = level;
              setLevel(newLevel); // optimistic — dropdown updates immediately
              updateLevelMutation.mutate(
                { level: newLevel },
                { onError: () => setLevel(previous) }, // rollback on server failure
              );
              void queryClient.invalidateQueries({ queryKey: ['stats'] });
              void queryClient.invalidateQueries({ queryKey: ['tasks'] });
            }}
            testId="select-level"
          />
          <SelectDropdown
            label={t('themeLabel')}
            value={theme}
            options={themeOptions}
            onChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
            testId="select-theme"
          />
          <SelectDropdown
            label={t('languageLabel')}
            value={language}
            options={LANGUAGE_OPTIONS}
            onChange={(v) => {
              setLanguage(v as AppLanguage);
              void queryClient.invalidateQueries({ queryKey: ['stats'] });
              void queryClient.invalidateQueries({ queryKey: ['tasks'] });
              void queryClient.invalidateQueries({ queryKey: ['texts'] });
            }}
            testId="select-language"
          />
          <SelectDropdown
            label={t('uiLanguageLabel')}
            value={uiLocale}
            options={UI_LOCALE_OPTIONS}
            onChange={handleLocaleChange}
            testId="select-ui-locale"
          />
          <SelectDropdown
            label={t('topicLabel')}
            value={taskTopic}
            options={TOPIC_OPTIONS.map((o) => ({
              value: o.value,
              label: o.value === '' ? t('topicAny') : o.label,
            }))}
            onChange={setTaskTopic}
            testId="select-topic"
          />
        </div>
      </section>

      <section className="mt-5 rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-float">
        <h2 className="text-lg font-semibold">{t('accountManagement')}</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('signedInAs')} {user?.email ?? '—'}</p>
        <Link href="/" className="mt-3 inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">
          {t('apply')}
        </Link>
      </section>
      </div>
    </LabFrame>
  );
}
