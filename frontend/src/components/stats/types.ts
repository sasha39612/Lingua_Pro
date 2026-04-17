export type Period = 'week' | 'month' | 'all';
export type SkillKey = 'reading' | 'listening' | 'writing' | 'speaking';
export type TargetLevel = 'B1' | 'B2' | 'C1' | 'C2';

export interface SummaryStats {
  targetLevel: string;
  activeDays: number;
  examReadiness: number;
  readinessLabel: string;
  blockedBy?: string;
  streak: number;
  periodLabel: string;
  deltaNote?: string;
  isOvershoot?: boolean;
}

export interface FocusSkill {
  label: string;
  skill: keyof ExamSkillScores;
  gapPts: number;
}

export interface ExamSkillScores {
  reading: number;
  writing: number;
  speaking: number;
  listening: number;
}

export interface ExamSkillCounts {
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
  href: string;
}
