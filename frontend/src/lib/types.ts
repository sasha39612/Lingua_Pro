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
  avg_reading_score: number;
  avg_writing_score: number;
  avg_speaking_score: number;
  avg_listening_score: number;
  avg_pronunciation_score: number;
  reading_count: number;
  writing_count: number;
  speaking_count: number;
  listening_count: number;
  mistakes_total: number;
  mistake_counts_by_type: Record<string, number>;
  history: Array<{ date: string; text_score: number; pronunciation_score: number }>;
  charts: {
    mistakesByType: { labels: string[]; values: number[] };
    progressOverTime: { labels: string[]; textScores: number[]; pronunciationScores: number[] };
  };
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  language: string;
  createdAt: string;
}

export interface AdminStatsOverview {
  period: 'week' | 'month' | 'all';
  language: string | null;
  last_updated: string;
  platform: {
    total_text_sessions: number;
    total_speaking_sessions: number;
    total_listening_sessions: number;
    total_sessions: number;
    most_popular_language: string | null;
  };
  avg_scores: { reading: number; writing: number; speaking: number; listening: number };
  by_language: Array<{
    language: string;
    text_count: number;
    speaking_count: number;
    avg_text_score: number;
    avg_speaking_score: number;
  }>;
  top_users_by_activity: Array<{
    userId: number;
    total_sessions: number;
    weighted_avg_score: number;
    last_active: string;
  }>;
  session_counts_by_feature: { reading: number; writing: number; speaking: number; listening: number };
  time_series: {
    daily_sessions: Array<{ date: string; count: number }>;
    daily_active_user_estimate: Array<{ date: string; count: number }>;
  };
  /** Session-derived proxies for AI load (not actual API call counts). */
  feature_usage_proxy: {
    text_operations: number;
    speech_operations: number;
    listening_operations: number;
  };
  funnel: {
    registered: number;
    /** Systematic overcount: per-service distinct user counts summed.
     *  Users active on both text and audio the same day are counted twice. */
    active_users_cross_service_estimate: number;
    completed_task: number;
  };
  /** Real AI usage data from ai-orchestrator. null until logging is active. */
  ai_cost: {
    total_tokens: number;
    total_cost_usd: number;
    by_feature: Array<{
      featureType: string;
      eventCount: number;
      totalTokens: number;
      totalCostUsd: number;
      avgDurationMs: number;
    }>;
    by_model: Array<{
      model: string;
      totalTokens: number;
      totalCostUsd: number;
      eventCount: number;
    }>;
    failure_rate: number;
    retry_rate: number;
  } | null;
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
