export type Period = 'week' | 'month' | 'all';
export type SkillKey = 'reading' | 'listening' | 'writing' | 'speaking';

export interface SummaryStats {
  level: string;
  nextLevel: string;
  activeDays: number;
  accuracy: number;
  streak: number;
  periodLabel: string;
}

export interface SkillScores {
  reading: number;
  writing: number;
  speaking: number;
  listening: number;
}

export interface ChartData {
  progressOverTime: {
    labels: string[];
    textScores: number[];
    pronunciationScores: number[];
  };
  mistakesByType: {
    labels: string[];
    values: number[];
  };
}

export interface WeakPoint {
  label: string;
  count: number;
  skill: SkillKey;
}
