'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LabFrame } from '@/components/lab-frame';
import { useAppStore } from '@/store/app-store';
import { StatsData } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'all';

// ── Helpers ───────────────────────────────────────────────────────────────────

const CEFR_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function getNextLevel(level: string): string {
  const idx = CEFR_LEVELS.indexOf(level);
  return idx >= 0 && idx < CEFR_LEVELS.length - 1 ? CEFR_LEVELS[idx + 1] : level;
}

function computeStreak(history: Array<{ date: string }>): number {
  if (history.length === 0) return 0;
  const dates = new Set(history.map((h) => h.date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (dates.has(dateStr)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function formatMistakeLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────────

function ProgressLineChart({
  labels,
  textScores,
  pronunciationScores,
}: {
  labels: string[];
  textScores: number[];
  pronunciationScores: number[];
}) {
  if (labels.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        No data for this period
      </div>
    );
  }

  const W = 460;
  const H = 150;
  const PAD = { top: 10, right: 12, bottom: 28, left: 32 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const n = labels.length;

  const toX = (i: number) =>
    PAD.left + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
  const toY = (v: number) => PAD.top + chartH - v * chartH;

  const linePoints = (scores: number[]) =>
    scores.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');

  const labelIndices = new Set<number>([0, n - 1]);
  const step = Math.max(1, Math.floor(n / 5));
  for (let i = step; i < n - 1; i += step) labelIndices.add(i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 150 }}>
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = toY(pct);
        return (
          <g key={pct}>
            <line
              x1={PAD.left}
              y1={y}
              x2={W - PAD.right}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text x={PAD.left - 4} y={y + 3} fontSize={8} textAnchor="end" fill="#94a3b8">
              {Math.round(pct * 100)}
            </text>
          </g>
        );
      })}

      <polyline
        points={linePoints(textScores)}
        fill="none"
        stroke="#0ea5e9"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points={linePoints(pronunciationScores)}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {textScores.map((v, i) => (
        <circle key={`t${i}`} cx={toX(i)} cy={toY(v)} r={2.5} fill="#0ea5e9" />
      ))}
      {pronunciationScores.map((v, i) => (
        <circle key={`p${i}`} cx={toX(i)} cy={toY(v)} r={2.5} fill="#8b5cf6" />
      ))}

      {[...labelIndices].map((i) => (
        <text key={i} x={toX(i)} y={H - 4} fontSize={8} textAnchor="middle" fill="#94a3b8">
          {labels[i].slice(5)}
        </text>
      ))}
    </svg>
  );
}

// ── Bar Chart (Mistakes) ───────────────────────────────────────────────────────

function MistakeBarChart({ labels, values }: { labels: string[]; values: number[] }) {
  if (labels.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        No mistake data for this period
      </div>
    );
  }

  const top = labels.slice(0, 7);
  const vals = values.slice(0, 7);
  const max = Math.max(...vals, 1);
  const BAR_MAX_H = 100;

  return (
    <div className="mt-3 flex items-end gap-2" style={{ height: BAR_MAX_H + 48 }}>
      {top.map((label, i) => {
        const h = Math.max(6, Math.round((vals[i] / max) * BAR_MAX_H));
        return (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs font-medium text-slate-500">{vals[i]}</span>
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-violet-500 to-purple-400 transition-all"
              style={{ height: h }}
            />
            <span
              className="text-center leading-tight text-slate-400"
              style={{ fontSize: 9, maxWidth: 52 }}
            >
              {formatMistakeLabel(label)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Progress Bar ───────────────────────────────────────────────────────────────

function ProgressBar({ value, color = 'bg-sky-500' }: { value: number; color?: string }) {
  return (
    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-float">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-1 text-2xl font-semibold text-slate-800">{value}</h2>
      <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function StatsPage() {
  const language = useAppStore((s) => s.language);
  const level = useAppStore((s) => s.level);
  const [period, setPeriod] = useState<Period>('week');

  const { data, isLoading, isError } = useQuery<StatsData>({
    queryKey: ['stats', language, period],
    queryFn: async () => {
      const res = await fetch(`/api/stats?language=${encodeURIComponent(language)}&period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    staleTime: 60_000,
  });

  const streak = useMemo(() => computeStreak(data?.history ?? []), [data?.history]);
  const nextLevel = getNextLevel(level);
  const textPct = data ? Math.round(data.avg_text_score * 100) : 0;
  const speakingPct = data ? Math.round(data.avg_pronunciation_score * 100) : 0;
  const avgAccuracy = data ? Math.round(((data.avg_text_score + data.avg_pronunciation_score) / 2) * 100) : 0;
  const activeDays = data?.history.length ?? 0;

  const weakPoints = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.mistake_counts_by_type)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [data]);

  const periodLabel = period === 'week' ? 'this week' : period === 'month' ? 'this month' : 'all time';

  return (
    <LabFrame>
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Header */}
        <section className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-float">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Statistics</h1>
            <p className="mt-0.5 text-sm text-slate-500">Your learning progress · {language}</p>
          </div>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none"
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
          >
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="all">All time</option>
          </select>
        </section>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard title="Level" value={level} sub={`Next: ${nextLevel}`} />
          <StatCard
            title="Active Days"
            value={isLoading ? '…' : String(activeDays)}
            sub={periodLabel}
          />
          <StatCard
            title="Accuracy"
            value={isLoading ? '…' : `${avgAccuracy}%`}
            sub="text + speaking avg"
          />
          <StatCard
            title="Streak"
            value={isLoading ? '…' : `${streak} days`}
            sub={streak > 0 ? 'Keep going!' : 'Start today'}
          />
        </div>

        {/* Level Progress + Skills */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-float">
            <h3 className="font-semibold text-slate-800">Level Progress</h3>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-slate-600">
                <span>{level}</span>
                <span>{nextLevel}</span>
              </div>
              <ProgressBar value={textPct} color="bg-sky-500" />
              <p className="mt-2 text-xs text-slate-400">
                Based on your text accuracy score ({isLoading ? '…' : `${textPct}%`})
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-float">
            <h3 className="font-semibold text-slate-800">Skills</h3>
            <div className="mt-4 space-y-3">
              {[
                { name: 'Reading / Writing', value: textPct, color: 'bg-sky-500' },
                { name: 'Speaking', value: speakingPct, color: 'bg-violet-500' },
              ].map((skill) => (
                <div key={skill.name}>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>{skill.name}</span>
                    <span>{isLoading ? '…' : `${skill.value}%`}</span>
                  </div>
                  <ProgressBar value={isLoading ? 0 : skill.value} color={skill.color} />
                </div>
              ))}
              <p className="text-xs text-slate-400">Listening is tracked within the Speaking score</p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-float">
            <h3 className="font-semibold text-slate-800">Progress Over Time</h3>
            <div className="mt-1 flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-4 rounded-sm bg-sky-500" />
                Text
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-4 rounded-sm bg-violet-500" />
                Speaking
              </span>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <div className="flex h-40 items-center justify-center text-sm text-slate-400">
                  Loading…
                </div>
              ) : (
                <ProgressLineChart
                  labels={data?.charts.progressOverTime.labels ?? []}
                  textScores={data?.charts.progressOverTime.textScores ?? []}
                  pronunciationScores={data?.charts.progressOverTime.pronunciationScores ?? []}
                />
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-float">
            <h3 className="font-semibold text-slate-800">Mistakes by Type</h3>
            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-slate-400">
                Loading…
              </div>
            ) : (
              <MistakeBarChart
                labels={data?.charts.mistakesByType.labels ?? []}
                values={data?.charts.mistakesByType.values ?? []}
              />
            )}
          </div>
        </div>

        {/* Weak Points */}
        <div className="rounded-2xl bg-white p-6 shadow-float">
          <h3 className="mb-3 font-semibold text-slate-800">Weak Points</h3>
          {isLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : weakPoints.length === 0 ? (
            <p className="text-sm text-slate-400">
              No mistakes recorded for this period. Great work!
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {weakPoints.map(([type, count]) => (
                <li
                  key={type}
                  className="flex items-center justify-between py-2 text-sm text-slate-600"
                >
                  <span>{formatMistakeLabel(type)}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                    {count}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isError && (
          <p className="text-center text-sm text-red-500">
            Could not load statistics. Check your connection or try again.
          </p>
        )}

      </div>
    </LabFrame>
  );
}
