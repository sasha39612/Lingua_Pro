import { SkillKey, TargetLevel, WeakPoint } from './types';

const CEFR_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const CEFR_TARGET_LEVELS: TargetLevel[] = ['B1', 'B2', 'C1', 'C2'];

export function getNextLevel(level: string): string {
  const idx = CEFR_LEVELS.indexOf(level);
  return idx >= 0 && idx < CEFR_LEVELS.length - 1 ? CEFR_LEVELS[idx + 1] : level;
}

export function computeStreak(history: Array<{ date: string }>): number {
  if (history.length === 0) return 0;
  const dates = new Set(history.map((h) => h.date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (dates.has(d.toISOString().slice(0, 10))) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// text covers Reading+Writing (60%), pronunciation covers Speaking+Listening (40%)
export function computeReadiness(textScore: number, pronunciationScore: number): number {
  return Math.round(textScore * 60 + pronunciationScore * 40);
}

export function getReadinessLabel(pct: number): string {
  if (pct >= 90) return 'Exam confident';
  if (pct >= 80) return 'Ready';
  if (pct >= 65) return 'Almost ready';
  if (pct >= 50) return 'Building skills';
  return 'Getting started';
}

export function getSkillStatus(pct: number): string {
  if (pct > 75) return 'Ready';
  if (pct > 50) return 'Needs improvement';
  return 'Weak';
}

export function formatMistakeLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface DeltaResult {
  label: string;
  value: number;
}

export function computeDelta(current: number, previous: number): DeltaResult | null {
  if (previous === 0) return null;
  const delta = current - previous;
  if (Math.abs(delta) < 1) return { label: 'Steady', value: 0 };
  return {
    label: delta > 0 ? `+${delta}%` : `${delta}%`,
    value: delta,
  };
}

export function getPeriodStartDate(period: 'week' | 'month' | 'all'): string | null {
  if (period === 'all') return null;
  const d = new Date();
  if (period === 'week') d.setDate(d.getDate() - 7);
  if (period === 'month') d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

export function computePreviousReadiness(
  history: Array<{ date: string; text_score: number; pronunciation_score: number }>,
  period: 'week' | 'month' | 'all',
): number {
  if (period === 'all' || history.length === 0) return 0;
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  return computeReadiness(first.text_score, first.pronunciation_score);
}

export const WEAK_POINT_CONFIG: Record<string, { label: string; href: string }> = {
  grammar:             { label: 'Grammar',      href: '/writing' },
  spelling:            { label: 'Spelling',      href: '/writing' },
  punctuation:         { label: 'Punctuation',   href: '/writing' },
  article:             { label: 'Articles',      href: '/writing' },
  preposition:         { label: 'Prepositions',  href: '/writing' },
  vocabulary:          { label: 'Vocabulary',    href: '/writing' },
  tense:               { label: 'Tense Usage',   href: '/writing' },
  other:               { label: 'Other',         href: '/writing' },
  pronunciation_major: { label: 'Pronunciation', href: '/speaking' },
  pronunciation_minor: { label: 'Pronunciation', href: '/speaking' },
};

export function buildWeakPoints(
  mistakeCounts: Record<string, number>,
  limit = 5,
): WeakPoint[] {
  return Object.entries(mistakeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => {
      const cfg = WEAK_POINT_CONFIG[key];
      const href = cfg?.href ?? '/writing';
      return {
        label: cfg?.label ?? formatMistakeLabel(key),
        count,
        skill: (href.replace('/', '') as SkillKey) ?? 'writing',
        href,
      };
    });
}
