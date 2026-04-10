export type AppLanguage = 'English' | 'German' | 'Albanian' | 'Polish' | 'Ukrainian';

export type UserRole = 'student' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  language: string;
}

export interface TextResult {
  id: string;
  originalText: string;
  correctedText?: string | null;
  textScore?: number | null;
  feedback?: string | null;
  createdAt: string;
}

export interface StatsData {
  language: string;
  period: 'week' | 'month' | 'all';
  avg_text_score: number;
  avg_speaking_score: number;
  avg_listening_score: number;
  avg_pronunciation_score: number;
  mistakes_total: number;
  mistake_counts_by_type: Record<string, number>;
  history: Array<{ date: string; text_score: number; pronunciation_score: number }>;
  charts: {
    mistakesByType: { labels: string[]; values: number[] };
    progressOverTime: { labels: string[]; textScores: number[]; pronunciationScores: number[] };
  };
}

export interface LearningTask {
  id: string;
  language: string;
  level: string;
  skill: string;
  prompt: string;
  referenceText?: string | null;
  focusPhonemes: string[];
  answerOptions: string[];
  correctAnswer?: string | null;
  createdAt: string;
}
