import { SummaryStats } from './types';
import { DeltaResult } from './utils';

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
  const placeholder = '…';

  const readinessSub = isLoading
    ? ''
    : delta
    ? `${delta.label} · ${stats.readinessLabel}`
    : stats.readinessLabel;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard
        title="Target Level"
        value={stats.targetLevel}
        sub={isLoading ? '' : stats.targetLevelSub}
      />
      <StatCard
        title="Active Days"
        value={isLoading ? placeholder : String(stats.activeDays)}
        sub={stats.periodLabel}
      />
      <StatCard
        title="Exam Readiness"
        value={isLoading ? placeholder : `${stats.examReadiness}%`}
        sub={readinessSub}
        highlight
      />
      <StatCard
        title="Streak"
        value={isLoading ? placeholder : `${stats.streak} days`}
        sub={stats.streak > 0 ? 'Keep going!' : 'Start today'}
      />
    </div>
  );
}
