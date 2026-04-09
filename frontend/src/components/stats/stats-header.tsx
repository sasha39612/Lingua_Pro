'use client';

import { SelectDropdown } from '@/components/select-dropdown';
import { Period } from './types';

const PERIOD_OPTIONS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

interface StatsHeaderProps {
  language: string;
  period: Period;
  onPeriodChange: (p: Period) => void;
}

export function StatsHeader({ language, period, onPeriodChange }: StatsHeaderProps) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-float">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Statistics</h1>
        <p className="mt-0.5 text-sm text-slate-500">Your learning progress · {language}</p>
      </div>

      <div className="w-40">
        <SelectDropdown
          value={period}
          options={PERIOD_OPTIONS}
          onChange={(v) => onPeriodChange(v as Period)}
        />
      </div>
    </section>
  );
}
