'use client';

interface StatsChartProps {
  values: number[];
}

export function StatsChart({ values }: StatsChartProps) {
  const safeValues = values.length > 0 ? values : [0.45, 0.6, 0.72, 0.8, 0.7];
  const max = Math.max(...safeValues, 1);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-float">
      <h3 className="text-lg font-semibold">Progress Metrics</h3>
      <p className="mt-2 text-sm text-slate-600">Rolling text-score history from recent submissions.</p>
      <div className="mt-4 flex items-end gap-2">
        {safeValues.map((score, idx) => {
          const pct = Math.round((score / max) * 100);
          return (
            <div key={`${score}-${idx}`} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-sky-500 to-teal-500 transition-all"
                style={{ height: `${Math.max(10, pct)}px` }}
              />
              <span className="text-xs text-slate-500">{Math.round(score * 100)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
