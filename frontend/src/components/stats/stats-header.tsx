'use client';

import { SelectDropdown } from '@/components/select-dropdown';
import { Period, TargetLevel } from './types';
import { useTranslations } from 'next-intl';

interface StatsHeaderProps {
  language: string;
  period: Period;
  onPeriodChange: (p: Period) => void;
  targetLevel: TargetLevel;
  onTargetLevelChange: (lvl: TargetLevel) => void;
  examReadiness: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function StatsHeader({
  language,
  period,
  onPeriodChange,
  targetLevel,
  onTargetLevelChange,
  examReadiness,
  onRefresh,
  isRefreshing,
}: StatsHeaderProps) {
  const t = useTranslations('stats');

  const PERIOD_OPTIONS = [
    { value: 'week', label: t('periodWeek') },
    { value: 'month', label: t('periodMonth') },
    { value: 'all', label: t('periodAll') },
  ];

  const TARGET_LEVEL_OPTIONS = [
    { value: 'B1', label: t('targetPrefix', { level: 'B1' }) },
    { value: 'B2', label: t('targetPrefix', { level: 'B2' }) },
    { value: 'C1', label: t('targetPrefix', { level: 'C1' }) },
    { value: 'C2', label: t('targetPrefix', { level: 'C2' }) },
  ];

  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-float">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {t('prepareFor', { level: targetLevel })}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {t('youAreReady', { readiness: examReadiness, language })}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {t('basedOn')}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          title={t('refreshTitle')}
        >
          <svg
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isRefreshing ? t('refreshing') : t('refresh')}
        </button>
        <div className="w-32">
          <SelectDropdown
            value={targetLevel}
            options={TARGET_LEVEL_OPTIONS}
            onChange={(v) => onTargetLevelChange(v as TargetLevel)}
          />
        </div>
        <div className="w-36">
          <SelectDropdown
            value={period}
            options={PERIOD_OPTIONS}
            onChange={(v) => onPeriodChange(v as Period)}
          />
        </div>
      </div>
    </section>
  );
}
