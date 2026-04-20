import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

type AdminPeriod = 'week' | 'month' | 'all';

// ─── Stable canonical language map ───────────────────────────────────────────
// Extend this when adding new supported languages.
const LANG_CANONICAL: Record<string, string> = {
  english:  'english', en: 'english',
  german:   'german',  de: 'german',
  albanian: 'albanian', sq: 'albanian',
  polish:   'polish',  pl: 'polish',
  ukrainian: 'ukrainian', uk: 'ukrainian',
};

function normLang(l?: string): string {
  if (!l) return 'other';
  const v = l.toLowerCase().trim();
  const canonical = LANG_CANONICAL[v];
  if (!canonical) {
    // Log unmapped values so they can be added to LANG_CANONICAL later.
    // Do NOT return v — unbounded strings in analytics keys degrade grouping over time.
    console.warn(`[admin-stats] unknown language value: "${v}" — mapped to "other"`);
    return 'other';
  }
  return canonical;
}

// ─── Request ID helper ────────────────────────────────────────────────────────
// Always use this — never construct headers with x-request-id manually.
export function withRequestId(
  baseHeaders: Record<string, string>,
  requestId?: string,
): Record<string, string> {
  return {
    ...baseHeaders,
    'x-request-id': requestId ?? randomUUID(),
  };
}

// ─── Typed downstream response shapes ────────────────────────────────────────

interface TextAdminSummary {
  period: AdminPeriod;
  language: string | null;
  total_sessions: number;
  by_language: Array<{ language: string; count: number; avg_score: number }>;
  by_skill: {
    reading: { count: number; avg_score: number };
    writing: { count: number; avg_score: number };
  };
  top_users: Array<{ userId: number; count: number; score_sum: number; avg_score: number; last_active: string }>;
  time_series: {
    daily_sessions: Array<{ date: string; count: number }>;
    daily_active_user_estimate: Array<{ date: string; count: number }>;
  };
  funnel: { with_text_activity: number; completed_task: number };
  daily_active_user_ids?: Array<{ date: string; userIds: number[] }>;
}

interface AiUsageRow {
  feature_type: string;
  endpoint: string | null;
  model: string;
  request_type: string;
  success: boolean;
  event_count: number;
  total_prompt_tokens: string | null;   // BigInt serialised as string by Prisma
  total_completion_tokens: string | null;
  total_tokens: string | null;
  avg_duration_ms: number | null;
  total_cost_usd: number | null;
  total_retries: number | null;
}

interface AudioAdminSummary {
  period: AdminPeriod;
  language: string | null;
  total_speaking_sessions: number;
  total_listening_sessions: number;
  by_language: Array<{
    language: string;
    speaking_count: number;
    listening_count: number;
    avg_pronunciation_score: number;
  }>;
  top_users_speaking: Array<{ userId: number; count: number; score_sum: number; avg_score: number; last_active: string }>;
  top_users_listening: Array<{ userId: number; count: number; score_sum: number; avg_score: number; last_active: string }>;
  time_series: {
    daily_speaking: Array<{ date: string; count: number }>;
    daily_listening: Array<{ date: string; count: number }>;
    daily_active_user_estimate: Array<{ date: string; count: number }>;
  };
  funnel: { with_audio_activity: number };
  daily_active_user_ids?: Array<{ date: string; userIds: number[] }>;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class AdminStatsService {
  private readonly logger = new Logger(AdminStatsService.name);

  // Typed clients — URLs only; never hardcode in method bodies
  private readonly textClient:  { url: string };
  private readonly audioClient: { url: string };
  private readonly authClient:  { url: string };
  private readonly aiClient:    { url: string };

  private readonly internalToken: string;

  // In-flight deduplication — prevents fan-out storm when multiple admins load simultaneously
  private readonly inFlight = new Map<string, Promise<ReturnType<typeof this.merge>>>();
  private readonly IN_FLIGHT_TTL_MS = 10_000;

  constructor() {
    this.textClient  = { url: process.env.TEXT_SERVICE_URL       || 'http://text-service:4002' };
    this.audioClient = { url: process.env.AUDIO_SERVICE_URL      || 'http://audio-service:4003' };
    this.authClient  = { url: process.env.AUTH_SERVICE_URL       || 'http://auth-service:4001' };
    this.aiClient    = { url: process.env.AI_ORCHESTRATOR_URL    || 'http://ai-orchestrator:4005' };
    this.internalToken = process.env.INTERNAL_SERVICE_SECRET || '';
  }

  async getAdminStats(period: AdminPeriod, language?: string, exact = false, debugMode = false, requestId?: string) {
    // Stable cache key — JSON.stringify is key-order-dependent and must not be used
    const key = `${period}:${language ?? ''}:${exact}:${debugMode}`;

    if (this.inFlight.has(key)) return this.inFlight.get(key)!;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.IN_FLIGHT_TTL_MS);

    const p = this.fetchAndMerge(period, language, exact, debugMode, requestId, controller.signal)
      .finally(() => {
        clearTimeout(timeout);
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, p);
    return p;
  }

  private async fetchAndMerge(
    period: AdminPeriod,
    language?: string,
    exact = false,
    debugMode = false,
    requestId?: string,
    signal?: AbortSignal,
  ) {
    const params = new URLSearchParams({ period });
    if (language) params.set('language', language);
    if (exact)    params.set('exact', 'true');

    const baseHeaders: Record<string, string> = {
      'x-internal-token':   this.internalToken,
      'x-internal-service': 'stats-service',
    };
    if (debugMode) baseHeaders['x-debug-mode'] = 'true';
    // Thread request ID through all downstream calls
    const internalHeaders = withRequestId(baseHeaders, requestId);

    const [textSummary, audioSummary, registeredCount, aiUsageRaw] = await Promise.all([
      this.fetchText<TextAdminSummary>(`/text/admin/summary?${params}`, internalHeaders, signal),
      this.fetchAudio<AudioAdminSummary>(`/audio/admin/summary?${params}`, internalHeaders, signal),
      this.fetchUsersCount(internalHeaders, signal),
      this.fetchAiUsage<{ rows: AiUsageRow[] }>(`/usage/admin?${params}`, internalHeaders, signal),
    ]);

    return this.merge(period, language ?? null, textSummary, audioSummary, registeredCount, exact, aiUsageRaw);
  }

  // ─── Merge logic ────────────────────────────────────────────────────────────

  private merge(
    period: AdminPeriod,
    language: string | null,
    text: TextAdminSummary,
    audio: AudioAdminSummary,
    registeredCount: number,
    exact: boolean,
    aiUsageRaw: { rows: AiUsageRow[] } | null,
  ) {
    // by_language — merge text + audio arrays into a unified per-language map
    const langMap = new Map<string, {
      language: string;
      text_count: number;
      speaking_count: number;
      listening_count: number;
      text_score_sum: number;
      speaking_score_sum: number;
    }>();

    for (const t of text.by_language) {
      const key = normLang(t.language);
      const existing = langMap.get(key) ?? zeroLang(key);
      existing.text_count += t.count;
      existing.text_score_sum += t.count > 0 ? t.avg_score * t.count : 0;
      langMap.set(key, existing);
    }
    for (const a of audio.by_language) {
      const key = normLang(a.language);
      const existing = langMap.get(key) ?? zeroLang(key);
      existing.speaking_count += a.speaking_count;
      existing.listening_count += a.listening_count;
      existing.speaking_score_sum += a.avg_pronunciation_score * a.speaking_count;
      langMap.set(key, existing);
    }

    const byLanguage = [...langMap.values()].map((l) => ({
      language: l.language,
      text_count: l.text_count,
      speaking_count: l.speaking_count,
      avg_text_score: safeAvg(l.text_score_sum, l.text_count),
      avg_speaking_score: safeAvg(l.speaking_score_sum, l.speaking_count),
    }));

    // most_popular_language — highest text + speaking + listening
    const mostPopular = [...langMap.entries()].sort(
      ([, a], [, b]) =>
        (b.text_count + b.speaking_count + b.listening_count) -
        (a.text_count + a.speaking_count + a.listening_count),
    )[0]?.[0] ?? null;

    // top_users_by_activity — merge text + audio top-user arrays by userId
    const userMap = new Map<number, { text_count: number; text_score_sum: number; audio_count: number; audio_score_sum: number; last_active: string }>();

    for (const u of text.top_users) {
      const e = userMap.get(u.userId) ?? zeroUser();
      e.text_count += u.count;
      e.text_score_sum += u.score_sum;
      if (!e.last_active || u.last_active > e.last_active) e.last_active = u.last_active;
      userMap.set(u.userId, e);
    }
    for (const u of [...audio.top_users_speaking, ...audio.top_users_listening]) {
      const e = userMap.get(u.userId) ?? zeroUser();
      e.audio_count += u.count;
      e.audio_score_sum += u.score_sum;
      if (!e.last_active || u.last_active > e.last_active) e.last_active = u.last_active;
      userMap.set(u.userId, e);
    }

    const topUsers = [...userMap.entries()]
      .map(([userId, u]) => {
        const totalCount = u.text_count + u.audio_count;
        const totalScoreSum = u.text_score_sum + u.audio_score_sum;
        return {
          userId,
          total_sessions: totalCount,
          weighted_avg_score: safeAvg(totalScoreSum, totalCount),
          last_active: u.last_active,
        };
      })
      .sort((a, b) => b.total_sessions - a.total_sessions)
      .slice(0, 20);

    // time_series — merge daily_sessions (text) + daily_speaking + daily_listening (audio)
    const dailySessions = mergeDailyByDate(text.time_series.daily_sessions, []);
    const dailyActiveEst = mergeDailyByDate(
      text.time_series.daily_active_user_estimate,
      audio.time_series.daily_active_user_estimate,
    );

    // exact mode — deduplicate user IDs across services per day
    let finalDailyActiveEst = dailyActiveEst;
    if (exact && text.daily_active_user_ids && audio.daily_active_user_ids) {
      const textIdMap = new Map(text.daily_active_user_ids.map((d) => [d.date, d.userIds]));
      const audioIdMap = new Map(audio.daily_active_user_ids.map((d) => [d.date, d.userIds]));
      const allDates = new Set([...textIdMap.keys(), ...audioIdMap.keys()]);
      finalDailyActiveEst = [...allDates]
        .sort()
        .map((date) => ({
          date,
          count: new Set([...(textIdMap.get(date) ?? []), ...(audioIdMap.get(date) ?? [])]).size,
        }));
    }

    // scores
    const avgReading  = text.by_skill.reading.count  > 0 ? text.by_skill.reading.avg_score  : 0;
    const avgWriting  = text.by_skill.writing.count  > 0 ? text.by_skill.writing.avg_score  : 0;
    const avgSpeaking = audio.by_language.length > 0
      ? safeAvg(
          audio.by_language.reduce((s, l) => s + l.avg_pronunciation_score * l.speaking_count, 0),
          audio.by_language.reduce((s, l) => s + l.speaking_count, 0),
        )
      : 0;
    const allListeningScores = audio.top_users_listening;
    const listeningScoreSum  = allListeningScores.reduce((s, u) => s + u.score_sum, 0);
    const listeningCount     = allListeningScores.reduce((s, u) => s + u.count, 0);
    const avgListening       = safeAvg(listeningScoreSum, listeningCount);

    // funnel
    const activePeriod = text.funnel.with_text_activity + audio.funnel.with_audio_activity;

    return {
      period,
      language,
      last_updated: new Date().toISOString(),
      platform: {
        total_text_sessions:      text.total_sessions,
        total_speaking_sessions:  audio.total_speaking_sessions,
        total_listening_sessions: audio.total_listening_sessions,
        total_sessions: text.total_sessions + audio.total_speaking_sessions + audio.total_listening_sessions,
        most_popular_language: mostPopular,
      },
      avg_scores: {
        reading:  avgReading,
        writing:  avgWriting,
        speaking: avgSpeaking,
        listening: avgListening,
      },
      by_language: byLanguage,
      top_users_by_activity: topUsers,
      session_counts_by_feature: {
        reading:   text.by_skill.reading.count,
        writing:   text.by_skill.writing.count,
        speaking:  audio.total_speaking_sessions,
        listening: audio.total_listening_sessions,
      },
      time_series: {
        daily_sessions:              dailySessions,
        daily_active_user_estimate:  finalDailyActiveEst,
      },
      feature_usage_proxy: {
        // session counts as proxy for AI load — not actual API call counts
        text_operations:      text.total_sessions,
        speech_operations:    audio.total_speaking_sessions,
        listening_operations: audio.total_listening_sessions,
      },
      funnel: {
        registered:                        registeredCount,
        // Systematic overcount: text distinct + audio distinct users, summed.
        // Users active on both services the same day are counted twice.
        active_users_cross_service_estimate: activePeriod,
        completed_task:                    text.funnel.completed_task,
      },
      ai_cost: aiUsageRaw ? buildAiCost(aiUsageRaw.rows) : null,
    };
  }

  // ─── HTTP helpers ────────────────────────────────────────────────────────────

  private async fetchText<T>(path: string, headers: Record<string, string>, signal?: AbortSignal): Promise<T> {
    try {
      const res = await fetch(`${this.textClient.url}${path}`, { headers, signal });
      if (!res.ok) throw new Error(`text-service responded ${res.status}`);
      return res.json() as Promise<T>;
    } catch (err: any) {
      this.logger.error(`[AdminStatsService] text-service fetch failed: ${err?.message ?? err}`);
      throw err;
    }
  }

  private async fetchAudio<T>(path: string, headers: Record<string, string>, signal?: AbortSignal): Promise<T> {
    try {
      const res = await fetch(`${this.audioClient.url}${path}`, { headers, signal });
      if (!res.ok) throw new Error(`audio-service responded ${res.status}`);
      return res.json() as Promise<T>;
    } catch (err: any) {
      this.logger.error(`[AdminStatsService] audio-service fetch failed: ${err?.message ?? err}`);
      throw err;
    }
  }

  // fetchAiUsage — returns null on any error; ai_cost is optional, never breaks the dashboard
  private async fetchAiUsage<T>(path: string, headers: Record<string, string>, signal?: AbortSignal): Promise<T | null> {
    try {
      const res = await fetch(`${this.aiClient.url}${path}`, { headers, signal });
      if (!res.ok) {
        this.logger.warn(`[AdminStatsService] ai-orchestrator responded ${res.status}`);
        return null;
      }
      return res.json() as Promise<T>;
    } catch (err: any) {
      this.logger.warn(`[AdminStatsService] ai-orchestrator fetch failed (non-fatal): ${err?.message ?? err}`);
      return null;
    }
  }

  private async fetchUsersCount(headers: Record<string, string>, signal?: AbortSignal): Promise<number> {
    const query = '{ usersCount }';
    try {
      const res = await fetch(`${this.authClient.url}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ query }),
        signal,
      });
      if (!res.ok) throw new Error(`auth-service responded ${res.status}`);
      const json = (await res.json()) as { data?: { usersCount?: number } };
      return json.data?.usersCount ?? 0;
    } catch (err: any) {
      this.logger.error(`[AdminStatsService] auth-service usersCount failed: ${err?.message ?? err}`);
      return 0;
    }
  }
}

// ─── Pure merge helpers ───────────────────────────────────────────────────────

function safeAvg(sum: number, count: number): number {
  return count > 0 ? sum / count : 0;
}

function zeroLang(language: string) {
  return { language, text_count: 0, speaking_count: 0, listening_count: 0, text_score_sum: 0, speaking_score_sum: 0 };
}

function zeroUser() {
  return { text_count: 0, text_score_sum: 0, audio_count: 0, audio_score_sum: 0, last_active: '' };
}

function buildAiCost(rows: AiUsageRow[]) {
  let totalTokens = 0;
  let totalCostUsd = 0;
  let totalEvents = 0;
  let failedEvents = 0;
  let retriedEvents = 0;

  const byFeature = new Map<string, { eventCount: number; totalTokens: number; totalCostUsd: number; totalDurationMs: number }>();
  const byModel   = new Map<string, { eventCount: number; totalTokens: number; totalCostUsd: number }>();

  for (const row of rows) {
    const count   = row.event_count;
    const tokens  = Number(row.total_tokens ?? 0);
    const cost    = row.total_cost_usd ?? 0;
    const retries = row.total_retries ?? 0;
    const durMs   = row.avg_duration_ms ?? 0;

    totalEvents += count;
    totalTokens += tokens;
    totalCostUsd += cost;
    if (!row.success) failedEvents += count;
    if (retries > 0) retriedEvents += count;

    // by_feature — group by feature_type
    const ft = row.feature_type;
    const existing = byFeature.get(ft) ?? { eventCount: 0, totalTokens: 0, totalCostUsd: 0, totalDurationMs: 0 };
    existing.eventCount += count;
    existing.totalTokens += tokens;
    existing.totalCostUsd += cost;
    existing.totalDurationMs += durMs * count;
    byFeature.set(ft, existing);

    // by_model
    const m = row.model;
    const existingM = byModel.get(m) ?? { eventCount: 0, totalTokens: 0, totalCostUsd: 0 };
    existingM.eventCount += count;
    existingM.totalTokens += tokens;
    existingM.totalCostUsd += cost;
    byModel.set(m, existingM);
  }

  return {
    total_tokens: totalTokens,
    total_cost_usd: totalCostUsd,
    by_feature: [...byFeature.entries()].map(([featureType, v]) => ({
      featureType,
      eventCount: v.eventCount,
      totalTokens: v.totalTokens,
      totalCostUsd: v.totalCostUsd,
      avgDurationMs: v.eventCount > 0 ? v.totalDurationMs / v.eventCount : 0,
    })),
    by_model: [...byModel.entries()].map(([model, v]) => ({
      model,
      eventCount: v.eventCount,
      totalTokens: v.totalTokens,
      totalCostUsd: v.totalCostUsd,
    })),
    failure_rate: totalEvents > 0 ? failedEvents / totalEvents : 0,
    retry_rate: totalEvents > 0 ? retriedEvents / totalEvents : 0,
  };
}

function mergeDailyByDate(
  a: Array<{ date: string; count: number }>,
  b: Array<{ date: string; count: number }>,
): Array<{ date: string; count: number }> {
  const map = new Map<string, number>();
  for (const item of [...a, ...b]) {
    map.set(item.date, (map.get(item.date) ?? 0) + item.count);
  }
  return [...map.entries()].sort(([d1], [d2]) => d1.localeCompare(d2)).map(([date, count]) => ({ date, count }));
}
