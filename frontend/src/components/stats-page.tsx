'use client';

import { useMemo } from 'react';
import { LabFrame } from '@/components/lab-frame';
import { StatsChart } from '@/components/stats-chart';
import { useAppStore } from '@/store/app-store';

export function StatsPage() {
  const recentResults = useAppStore((s) => s.recentResults);
  const audioScores = useAppStore((s) => s.audioScores);

  const textScores = useMemo(
    () => recentResults.map((item) => Number(item.textScore || 0)).filter((v) => !Number.isNaN(v)).reverse(),
    [recentResults],
  );

  const audioTrend = useMemo(() => audioScores.slice().reverse(), [audioScores]);

  return (
    <LabFrame>
      <div className="mx-auto max-w-5xl">
      <section className="rounded-2xl bg-white p-5 shadow-float">
        <h1 className="text-2xl font-bold">Stats</h1>
        <p className="mt-2 text-sm text-slate-600">Charts for text and audio performance over time.</p>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <StatsChart values={textScores} />
        <StatsChart values={audioTrend} />
      </section>
      </div>
    </LabFrame>
  );
}
