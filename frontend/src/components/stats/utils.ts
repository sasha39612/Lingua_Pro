import { ExamSkillScores, SkillKey, TargetLevel, WeakPoint } from './types';

const CEFR_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const CEFR_TARGET_LEVELS: TargetLevel[] = ['B1', 'B2', 'C1', 'C2'];

export const LEVEL_THRESHOLDS: Record<TargetLevel, number> = {
  B1: 60,
  B2: 75,
  C1: 88,
  C2: 96,
};

export const NEXT_LEVEL: Record<TargetLevel, TargetLevel | null> = {
  B1: 'B2',
  B2: 'C1',
  C1: 'C2',
  C2: null,
};

export const SKILL_THRESHOLDS: Record<TargetLevel, Record<keyof ExamSkillScores, number>> = {
  B1: { reading: 60, writing: 60, speaking: 55, listening: 60 },
  B2: { reading: 75, writing: 75, speaking: 70, listening: 75 },
  C1: { reading: 88, writing: 88, speaking: 82, listening: 88 },
  C2: { reading: 96, writing: 96, speaking: 92, listening: 96 },
};

export const SKILL_PRIORITY: Record<keyof ExamSkillScores, number> = {
  speaking: 4,
  writing: 3,
  listening: 2,
  reading: 1,
};

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
  if (process.env.NODE_ENV !== 'production') {
    // Fallback produces English-only strings — add a WEAK_POINT_CONFIG entry with a
    // translationKey to ensure non-English locales get a translated label (WCAG 3.1.2).
    console.warn(`[WeakPoints] No WEAK_POINT_CONFIG entry for key "${key}". Add it to avoid untranslated labels.`);
  }
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

// IMPORTANT: rawScore must be computed in stats-page.tsx and passed here.
// Do NOT recompute it inside utils.
export function computeRawScore(
  reading: number,
  writing: number,
  speaking: number,
  listening: number,
): number {
  return Math.round(reading * 0.2 + writing * 0.3 + speaking * 0.3 + listening * 0.2);
}

export function computeReadinessTowardTarget(
  rawScore: number,
  targetLevel: TargetLevel,
): number {
  return Math.min(100, Math.round((rawScore / LEVEL_THRESHOLDS[targetLevel]) * 100));
}

export function computeOvershoot(
  rawScore: number,
  targetLevel: TargetLevel,
): number {
  return Math.max(0, rawScore - LEVEL_THRESHOLDS[targetLevel]);
}

export function getPeriodStartDate(period: 'week' | 'month' | 'all'): string | null {
  if (period === 'all') return null;
  const d = new Date();
  if (period === 'week') d.setDate(d.getDate() - 7);
  if (period === 'month') d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

const WINDOW = 5;
const MIN_WINDOW = 3;

export function computePreviousReadiness(
  history: Array<{ date: string; text_score: number; pronunciation_score: number }>,
  period: 'week' | 'month' | 'all',
  targetLevel: TargetLevel,
): number | null {
  // 'all' uses full range; delta logic still applies if there's enough history
  if (history.length < MIN_WINDOW + 1) return null;

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  // w = half of available history, capped at WINDOW.
  // previousWindow = entries [-(2w) .. -(w+1)]; current readiness is computed at the call site.
  // Non-overlapping by construction: slice(-2w, -w) and slice(-w) are disjoint.
  const w = Math.min(WINDOW, Math.floor(sorted.length / 2));
  const previousWindow = sorted.slice(-w * 2, -w);

  if (previousWindow.length < MIN_WINDOW) return null;

  const avgRaw = (arr: typeof sorted) => {
    const sum = arr.reduce((s, h) => s + (h.text_score + h.pronunciation_score) / 2, 0);
    return Math.round(sum / arr.length);
  };

  return computeReadinessTowardTarget(avgRaw(previousWindow), targetLevel);
}

export const WEAK_POINT_CONFIG: Record<string, { label: string; href: string }> = {
  grammar:              { label: 'Grammar',        href: '/writing' },
  spelling:             { label: 'Spelling',        href: '/writing' },
  punctuation:          { label: 'Punctuation',     href: '/writing' },
  article:              { label: 'Articles',        href: '/writing' },
  preposition:          { label: 'Prepositions',    href: '/writing' },
  vocabulary:           { label: 'Vocabulary',      href: '/writing' },
  tense:                { label: 'Tense Usage',     href: '/writing' },
  other:                { label: 'Other',           href: '/writing' },
  // Structured criteria keys (new records with writing analysis criteria)
  grammar_vocabulary:   { label: 'Grammar & Vocab', href: '/writing' },
  task_achievement:     { label: 'Task Achievement', href: '/writing' },
  coherence_structure:  { label: 'Coherence',        href: '/writing' },
  style:                { label: 'Style',             href: '/writing' },
  pronunciation_major:  { label: 'Pronunciation',    href: '/speaking' },
  pronunciation_minor:  { label: 'Pronunciation',    href: '/speaking' },
};

// Keep in sync with LEGACY_SEVERITY['other'] in stats-service
const DEFAULT_SEVERITY_PER_OBS = 0.1;

export function buildWeakPoints(
  mistakeCounts: Record<string, number>,
  mistakeSeverity: Record<string, number> = {},
  limit = 5,
): WeakPoint[] {
  return Object.entries(mistakeCounts)
    .sort((a, b) => {
      const sA = mistakeSeverity[a[0]] ?? a[1] * DEFAULT_SEVERITY_PER_OBS;
      const sB = mistakeSeverity[b[0]] ?? b[1] * DEFAULT_SEVERITY_PER_OBS;
      return sB - sA;
    })
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
