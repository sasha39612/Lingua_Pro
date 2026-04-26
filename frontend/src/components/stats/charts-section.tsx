'use client';

import { ChartData, TargetLevel } from './types';
import { LEVEL_THRESHOLDS } from './utils';
import { useTranslations } from 'next-intl';

// ── Progress Line Chart ────────────────────────────────────────────────────────

function ProgressLineChart({
  labels,
  textScores,
  pronunciationScores,
  targetLevel,
}: ChartData['progressOverTime'] & { targetLevel: TargetLevel }) {
  const t = useTranslations('stats');
  if (labels.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        {t('noData')}
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

  const pts = (scores: number[]) =>
    scores.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');

  const labelIdxs = new Set<number>([0, n - 1]);
  const step = Math.max(1, Math.floor(n / 5));
  for (let i = step; i < n - 1; i += step) labelIdxs.add(i);

  const targetLineY = toY(LEVEL_THRESHOLDS[targetLevel] / 100);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 150 }}>
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = toY(pct);
        return (
          <g key={pct}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PAD.left - 4} y={y + 3} fontSize={8} textAnchor="end" fill="#94a3b8">
              {Math.round(pct * 100)}
            </text>
          </g>
        );
      })}
      <line
        x1={PAD.left} y1={targetLineY}
        x2={W - PAD.right} y2={targetLineY}
        stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 2"
      />
      <polyline points={pts(textScores)} fill="none" stroke="#0ea5e9" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={pts(pronunciationScores)} fill="none" stroke="#8b5cf6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {textScores.map((v, i) => <circle key={`t${i}`} cx={toX(i)} cy={toY(v)} r={2.5} fill="#0ea5e9" />)}
      {pronunciationScores.map((v, i) => <circle key={`p${i}`} cx={toX(i)} cy={toY(v)} r={2.5} fill="#8b5cf6" />)}
      {[...labelIdxs].map((i) => (
        <text key={i} x={toX(i)} y={H - 4} fontSize={8} textAnchor="middle" fill="#94a3b8">
          {labels[i].slice(5)}
        </text>
      ))}
    </svg>
  );
}

// ── Mistake Bar Chart ──────────────────────────────────────────────────────────

function MistakeBarChart({ labels, values }: ChartData['mistakesByType']) {
  const t = useTranslations('stats');
  const top = labels.slice(0, 7);
  const vals = values.slice(0, 7);

  if (top.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        {t('noMistakeData')}
      </div>
    );
  }

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
            <span className="text-center leading-tight text-slate-400" style={{ fontSize: 9, maxWidth: 52 }}>
              {label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────

function ChartSkeleton() {
  const t = useTranslations('stats');
  return (
    <div className="flex h-40 items-center justify-center text-sm text-slate-400">
      {t('loadingChart')}
    </div>
  );
}

// ── Combined section ───────────────────────────────────────────────────────────

interface ChartsSectionProps {
  charts: ChartData;
  targetLevel: TargetLevel;
  isLoading: boolean;
}

export function ChartsSection({ charts, targetLevel, isLoading }: ChartsSectionProps) {
  const t = useTranslations('stats');
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Progress over time */}
      <div className="rounded-2xl bg-white p-6 shadow-float">
        <h3 className="font-semibold text-slate-800">{t('progressOverTime')}</h3>
        <div className="mt-1 flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-sm bg-sky-500" />
            {t('readingWriting')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-sm bg-violet-500" />
            {t('speakingListening')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-sm bg-amber-400" style={{ borderTop: '2px dashed #f59e0b', background: 'none' }} />
            {t('target')}
          </span>
        </div>
        <div className="mt-3">
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <ProgressLineChart
              labels={charts.progressOverTime.labels}
              textScores={charts.progressOverTime.textScores}
              pronunciationScores={charts.progressOverTime.pronunciationScores}
              targetLevel={targetLevel}
            />
          )}
        </div>
      </div>

      {/* Mistakes by type */}
      <div className="rounded-2xl bg-white p-6 shadow-float">
        <h3 className="font-semibold text-slate-800">{t('mistakesByType')}</h3>
        <div className="mt-3">
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <MistakeBarChart
              labels={charts.mistakesByType.labels}
              values={charts.mistakesByType.values}
            />
          )}
        </div>
      </div>
    </div>
  );
}
