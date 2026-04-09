'use client';

import { SelectDropdown } from '@/components/select-dropdown';
import { Period, TargetLevel } from './types';

const PERIOD_OPTIONS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

const TARGET_LEVEL_OPTIONS = [
  { value: 'B1', label: 'Target: B1' },
  { value: 'B2', label: 'Target: B2' },
  { value: 'C1', label: 'Target: C1' },
  { value: 'C2', label: 'Target: C2' },
];

interface StatsHeaderProps {
  language: string;
  period: Period;
  onPeriodChange: (p: Period) => void;
  targetLevel: TargetLevel;
  onTargetLevelChange: (lvl: TargetLevel) => void;
  examReadiness: number;
}

export function StatsHeader({
  language,
  period,
  onPeriodChange,
  targetLevel,
  onTargetLevelChange,
  examReadiness,
}: StatsHeaderProps) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-float">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Prepare for {targetLevel} Exam
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          You are {examReadiness}% ready · {language}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          Based on reading, writing, speaking, and listening performance
        </p>
      </div>

      <div className="flex gap-2">
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
