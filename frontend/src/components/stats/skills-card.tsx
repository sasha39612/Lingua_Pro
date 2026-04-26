'use client';

import { ExamSkillCounts, ExamSkillScores, TargetLevel } from './types';
import { SKILL_THRESHOLDS } from './utils';
import { useTranslations } from 'next-intl';

interface ProgressBarProps {
  value: number;
  color: string;
}

function ProgressBar({ value, color }: ProgressBarProps) {
  return (
    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

interface StatusMeta {
  label: string;
  color: string;
  icon: string;
}

function getStatusMeta(value: number, labels: { ready: string; needsImprovement: string; weak: string }): StatusMeta {
  if (value > 75) return { label: labels.ready,            color: 'text-green-600',  icon: '🟢' };
  if (value > 50) return { label: labels.needsImprovement, color: 'text-yellow-600', icon: '🟡' };
  return             { label: labels.weak,             color: 'text-red-600',    icon: '🔴' };
}

const SKILL_GROUPS: Array<{ key: keyof ExamSkillScores; labelKey: string; color: string }> = [
  { key: 'reading',   labelKey: 'reading',   color: 'bg-teal-500'    },
  { key: 'writing',   labelKey: 'writing',   color: 'bg-emerald-500' },
  { key: 'speaking',  labelKey: 'speaking',  color: 'bg-violet-500'  },
  { key: 'listening', labelKey: 'listening', color: 'bg-blue-500'    },
];

interface SkillsCardProps {
  scores: ExamSkillScores;
  counts: ExamSkillCounts;
  targetLevel: TargetLevel;
  isLoading: boolean;
}

export function SkillsCard({ scores, counts, targetLevel, isLoading }: SkillsCardProps) {
  const t = useTranslations('stats');
  const tn = useTranslations('nav');
  const statusLabels = { ready: t('ready'), needsImprovement: t('needsImprovement'), weak: t('weak') };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-float">
      <h3 className="font-semibold text-slate-800">{t('examSections')}</h3>
      <div className="mt-4 space-y-5">
        {SKILL_GROUPS.map(({ key, labelKey, color }) => {
          const label = tn(labelKey as Parameters<typeof tn>[0]);
          const pct = isLoading ? 0 : scores[key];
          const count = isLoading ? 0 : counts[key];
          const meta = getStatusMeta(pct, statusLabels);
          const gapPts = isLoading ? 0 : Math.max(0, SKILL_THRESHOLDS[targetLevel][key] - pct);
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>{label}</span>
                <span className="flex items-center gap-2">
                  {!isLoading && count > 0 && (
                    <span className="text-xs text-slate-400">{t('sessions', { count })}</span>
                  )}
                  <span>{isLoading ? '…' : `${pct}%`}</span>
                </span>
              </div>
              <ProgressBar value={pct} color={color} />
              {!isLoading && (
                <p className={`mt-1 text-xs font-medium ${count === 0 ? 'text-slate-400' : meta.color}`}>
                  {count === 0
                    ? t('noSessionsYet')
                    : gapPts > 0
                    ? `${meta.icon} ${meta.label} · ${t('ptsToTarget', { pts: gapPts })}`
                    : `${meta.icon} ${meta.label}`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
