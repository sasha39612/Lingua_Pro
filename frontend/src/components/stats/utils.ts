import { SkillKey, WeakPoint } from './types';

const CEFR_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

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

export function formatMistakeLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function mistakeSkill(key: string): SkillKey {
  return key.includes('pronunciation') ? 'speaking' : 'writing';
}

export function buildWeakPoints(
  mistakeCounts: Record<string, number>,
  limit = 5,
): WeakPoint[] {
  return Object.entries(mistakeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({
      label: formatMistakeLabel(key),
      count,
      skill: mistakeSkill(key),
    }));
}
