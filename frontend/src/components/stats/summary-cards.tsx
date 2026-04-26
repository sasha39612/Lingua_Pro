'use client';

import { SummaryStats } from './types';
import { DeltaResult } from './utils';
import { useTranslations } from 'next-intl';

interface CardProps {
  title: string;
  value: string;
  sub: string;
  highlight?: boolean;
}

function StatCard({ title, value, sub, highlight }: CardProps) {
  return (
    <div className={`rounded-2xl p-4 shadow-float ${highlight ? 'bg-blue-50' : 'bg-white'}`}>
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-1 text-2xl font-semibold text-slate-800">{value}</h2>
      <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

interface SummaryCardsProps {
  stats: SummaryStats;
  delta: DeltaResult | null;
  isLoading: boolean;
}

export function SummaryCards({ stats, delta, isLoading }: SummaryCardsProps) {
  const t = useTranslations('stats');
  const placeholder = '…';

  const readinessSub = isLoading
    ? ''
    : delta
    ? `${delta.label} · ${stats.readinessLabel}`
    : stats.readinessLabel;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard
        title={t('targetLevel')}
        value={stats.targetLevel}
        sub={isLoading ? '' : stats.targetLevelSub}
      />
      <StatCard
        title={t('activeDays')}
        value={isLoading ? placeholder : String(stats.activeDays)}
        sub={stats.periodLabel}
      />
      <StatCard
        title={t('examReadiness')}
        value={isLoading ? placeholder : `${stats.examReadiness}%`}
        sub={readinessSub}
        highlight
      />
      <StatCard
        title={t('streak')}
        value={isLoading ? placeholder : t('streakDays', { count: stats.streak })}
        sub={stats.streak > 0 ? t('keepGoing') : t('startToday')}
      />
    </div>
  );
}
