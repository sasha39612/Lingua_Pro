'use client';

import { TargetLevel } from './types';
import { NEXT_LEVEL } from './utils';
import { useTranslations } from 'next-intl';

interface ProgressBarProps {
  value: number;
  color?: string;
}

function ProgressBar({ value, color = 'bg-sky-500' }: ProgressBarProps) {
  return (
    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

interface LevelProgressCardProps {
  currentLevel: string;
  nextLevel: string;
  progressPct: number;
  targetLevel: TargetLevel;
  allSkillsMet: boolean;
  isLoading: boolean;
}

export function LevelProgressCard({
  currentLevel,
  nextLevel,
  progressPct,
  targetLevel,
  allSkillsMet,
  isLoading,
}: LevelProgressCardProps) {
  const t = useTranslations('stats');
  const nextTarget = NEXT_LEVEL[targetLevel];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-float">
      <h3 className="font-semibold text-slate-800">{t('examProgress')}</h3>
      <div className="mt-4">
        <div className="flex justify-between text-sm text-slate-600">
          <span>{currentLevel}</span>
          <span>{nextLevel}</span>
        </div>
        <ProgressBar value={isLoading ? 0 : progressPct} color="bg-sky-500" />
        <p className="mt-2 text-xs text-slate-400">
          {isLoading
            ? '…'
            : progressPct >= 100 && allSkillsMet && nextTarget
            ? t('aimFor', { level: nextTarget })
            : progressPct >= 100 && allSkillsMet
            ? t('highestLevelReached')
            : t('progressBased', { pct: progressPct })}
        </p>
      </div>
    </div>
  );
}
