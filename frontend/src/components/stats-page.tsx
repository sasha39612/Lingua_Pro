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
  getReadinessLabel,
  computeDelta,
  computePreviousReadiness,
  computeRawScore,
  computeReadinessTowardTarget,
  computeOvershoot,
  LEVEL_THRESHOLDS,
  SKILL_THRESHOLDS,
  SKILL_PRIORITY,
} from '@/components/stats/utils';
import { Period, ChartData, ExamSkillScores, ExamSkillCounts, TargetLevel, FocusSkill } from '@/components/stats/types';

export function StatsPage() {
  const language = useAppStore((s) => s.language);
  const level = useAppStore((s) => s.level);
  const user = useAppStore((s) => s.user);
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

  const { data, isLoading, isFetching, isError, refetch } = useQuery<StatsData>({
    queryKey: ['stats', language, period, user?.id],
    queryFn: async () => {
      const params = new URLSearchParams({ language, period });
      if (user?.id) params.set('userId', user.id);
      const res = await fetch(`/api/stats?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !!user,
  });

  // ── Derived values ───────────────────────────────────────────────────────────

  const streak = useMemo(() => computeStreak(data?.history ?? []), [data?.history]);
  const weakPoints = useMemo(
    () => buildWeakPoints(data?.mistake_counts_by_type ?? {}),
    [data?.mistake_counts_by_type],
  );

  const nextLevel = getNextLevel(level);

  const readingPct   = data ? Math.round((data.avg_reading_score  ?? 0) * 100) : 0;
  const writingPct   = data ? Math.round((data.avg_writing_score  ?? 0) * 100) : 0;
  const speakingPct  = data ? Math.round((data.avg_speaking_score ?? data.avg_pronunciation_score) * 100) : 0;
  const listeningPct = data ? Math.round((data.avg_listening_score ?? 0) * 100) : 0;

  const convertedHistory = (data?.history ?? []).map(h => ({
    date: h.date,
    text_score: Math.round(h.text_score * 100),
    pronunciation_score: Math.round(h.pronunciation_score * 100),
  }));

  const examSkillScores: ExamSkillScores = {
    reading: readingPct,
    writing: writingPct,
    speaking: speakingPct,
    listening: listeningPct,
  };

  const rawScore = data
    ? computeRawScore(readingPct, writingPct, speakingPct, listeningPct)
    : 0;

  const examReadiness = data
    ? computeReadinessTowardTarget(rawScore, targetLevel)
    : 0;

  const overshoot = data
    ? computeOvershoot(rawScore, targetLevel)
    : 0;

  const gapPts = rawScore < LEVEL_THRESHOLDS[targetLevel]
    ? LEVEL_THRESHOLDS[targetLevel] - rawScore
    : 0;

  const allSkillsMet = (['reading', 'writing', 'speaking', 'listening'] as const)
    .every(s => examSkillScores[s] >= SKILL_THRESHOLDS[targetLevel][s]);

  const effectiveReadinessLabel =
    examReadiness >= 100 && !allSkillsMet
      ? 'Almost ready'
      : getReadinessLabel(examReadiness);

  const previousReadiness = computePreviousReadiness(
    convertedHistory,
    period,
    targetLevel,
  );

  const delta = previousReadiness !== null
    ? computeDelta(examReadiness, previousReadiness)
    : null;

  const activeDays = data?.history.length ?? 0;

  const periodLabel =
    period === 'week' ? 'this week' : period === 'month' ? 'this month' : 'all time';

  const focusSkill: FocusSkill | null =
    (['reading', 'writing', 'speaking', 'listening'] as const)
      .map(s => ({
        label: s.charAt(0).toUpperCase() + s.slice(1),
        skill: s,
        gapPts: Math.max(0, SKILL_THRESHOLDS[targetLevel][s] - examSkillScores[s]),
      }))
      .filter(s => s.gapPts > 0)
      .sort((a, b) => {
        if (b.gapPts !== a.gapPts) return b.gapPts - a.gapPts;
        return SKILL_PRIORITY[b.skill] - SKILL_PRIORITY[a.skill];
      })[0] ?? null;

  const blockingSkill = (['reading', 'writing', 'speaking', 'listening'] as const)
    .find(s => examSkillScores[s] < SKILL_THRESHOLDS[targetLevel][s]);

  const blockedBy =
    examReadiness >= 100 && !allSkillsMet && blockingSkill
      ? blockingSkill.charAt(0).toUpperCase() + blockingSkill.slice(1)
      : undefined;

  const examSkillCounts: ExamSkillCounts = {
    reading: data?.reading_count ?? 0,
    writing: data?.writing_count ?? 0,
    speaking: data?.speaking_count ?? 0,
    listening: data?.listening_count ?? 0,
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
          onRefresh={() => { if (!isFetching) refetch(); }}
          isRefreshing={isFetching}
        />

        <SummaryCards
          stats={{ targetLevel, activeDays, examReadiness, readinessLabel: effectiveReadinessLabel, blockedBy, streak, periodLabel }}
          delta={delta}
          isLoading={isLoading}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <LevelProgressCard
            currentLevel={level}
            nextLevel={nextLevel}
            progressPct={examReadiness}
            targetLevel={targetLevel}
            isLoading={isLoading}
          />
          <SkillsCard scores={examSkillScores} counts={examSkillCounts} targetLevel={targetLevel} isLoading={isLoading} />
        </div>

        <ChartsSection charts={charts} targetLevel={targetLevel} isLoading={isLoading} />

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
