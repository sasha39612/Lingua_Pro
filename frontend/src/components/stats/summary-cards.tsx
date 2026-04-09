import { SummaryStats } from './types';

interface CardProps {
  title: string;
  value: string;
  sub: string;
}

function StatCard({ title, value, sub }: CardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-float">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-1 text-2xl font-semibold text-slate-800">{value}</h2>
      <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

interface SummaryCardsProps {
  stats: SummaryStats;
  isLoading: boolean;
}

export function SummaryCards({ stats, isLoading }: SummaryCardsProps) {
  const placeholder = '…';

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard
        title="Level"
        value={stats.level}
        sub={`Next: ${stats.nextLevel}`}
      />
      <StatCard
        title="Active Days"
        value={isLoading ? placeholder : String(stats.activeDays)}
        sub={stats.periodLabel}
      />
      <StatCard
        title="Accuracy"
        value={isLoading ? placeholder : `${stats.accuracy}%`}
        sub="text + speaking avg"
      />
      <StatCard
        title="Streak"
        value={isLoading ? placeholder : `${stats.streak} days`}
        sub={stats.streak > 0 ? 'Keep going!' : 'Start today'}
      />
    </div>
  );
}
