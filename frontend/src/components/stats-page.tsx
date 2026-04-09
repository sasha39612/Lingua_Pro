'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LabFrame } from '@/components/lab-frame';
import { useAppStore } from '@/store/app-store';
import { StatsData } from '@/lib/types';

import { StatsHeader } from '@/components/stats/stats-header';
import { SummaryCards } from '@/components/stats/summary-cards';
import { LevelProgressCard } from '@/components/stats/level-progress-card';
import { SkillsCard } from '@/components/stats/skills-card';
import { ChartsSection } from '@/components/stats/charts-section';
import { WeakPointsCard } from '@/components/stats/weak-points-card';
import { Achievements } from '@/components/stats/achievements';

import {
  getNextLevel,
  computeStreak,
  buildWeakPoints,
  computeReadiness,
  getReadinessLabel,
  computeDelta,
  computePreviousReadiness,
} from '@/components/stats/utils';
import { Period, ChartData, ExamSkillScores, TargetLevel } from '@/components/stats/types';

export function StatsPage() {
  const language = useAppStore((s) => s.language);
  const level = useAppStore((s) => s.level);
  const [period, setPeriod] = useState<Period>('week');
  const [targetLevel, setTargetLevel] = useState<TargetLevel>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('targetLevel') as TargetLevel) ?? 'B2';
    }
    return 'B2';
  });

  const handleTargetLevelChange = (lvl: TargetLevel) => {
    setTargetLevel(lvl);
    localStorage.setItem('targetLevel', lvl);
  };

  const { data, isLoading, isError } = useQuery<StatsData>({
    queryKey: ['stats', language, period],
    queryFn: async () => {
      const res = await fetch(
        `/api/stats?language=${encodeURIComponent(language)}&period=${period}`,
      );
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    staleTime: 60_000,
  });

  // ── Derived values ───────────────────────────────────────────────────────────

  const streak = useMemo(() => computeStreak(data?.history ?? []), [data?.history]);
  const weakPoints = useMemo(
    () => buildWeakPoints(data?.mistake_counts_by_type ?? {}),
    [data?.mistake_counts_by_type],
  );

  const nextLevel = getNextLevel(level);
  const textPct = data ? Math.round(data.avg_text_score * 100) : 0;
  const speakingPct = data ? Math.round(data.avg_pronunciation_score * 100) : 0;
  const examReadiness = data
    ? computeReadiness(data.avg_text_score, data.avg_pronunciation_score)
    : 0;
  const readinessLabel = getReadinessLabel(examReadiness);
  const activeDays = data?.history.length ?? 0;

  const previousReadiness = data
    ? computePreviousReadiness(data.history, period)
    : 0;
  const delta = data ? computeDelta(examReadiness, previousReadiness) : null;

  const periodLabel =
    period === 'week' ? 'this week' : period === 'month' ? 'this month' : 'all time';

  const examSkillScores: ExamSkillScores = {
    readingWriting: textPct,
    speakingListening: speakingPct,
  };

  const charts: ChartData = {
    progressOverTime: data?.charts.progressOverTime ?? { labels: [], textScores: [], pronunciationScores: [] },
    mistakesByType: data?.charts.mistakesByType ?? { labels: [], values: [] },
  };

  return (
    <LabFrame>
      <div className="mx-auto max-w-5xl space-y-5">

        <StatsHeader
          language={language}
          period={period}
          onPeriodChange={setPeriod}
          targetLevel={targetLevel}
          onTargetLevelChange={handleTargetLevelChange}
          examReadiness={examReadiness}
        />

        <SummaryCards
          stats={{ targetLevel, nextLevel, activeDays, examReadiness, readinessLabel, streak, periodLabel }}
          delta={delta}
          isLoading={isLoading}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <LevelProgressCard
            currentLevel={level}
            nextLevel={nextLevel}
            progressPct={examReadiness}
            isLoading={isLoading}
          />
          <SkillsCard scores={examSkillScores} isLoading={isLoading} />
        </div>

        <ChartsSection charts={charts} isLoading={isLoading} />

        <WeakPointsCard items={weakPoints} isLoading={isLoading} />

        <Achievements streak={streak} accuracy={examReadiness} activeDays={activeDays} />

        {isError && (
          <p className="text-center text-sm text-red-500">
            Could not load statistics. Check your connection or try again.
          </p>
        )}

      </div>
    </LabFrame>
  );
}
