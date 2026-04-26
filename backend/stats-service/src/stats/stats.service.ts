import { Injectable, Logger } from '@nestjs/common';

type Period = 'week' | 'month' | 'all';

// Continuous weakness signal — not a discrete mistake counter.
// 1 writing submission contributes to up to 4 dimensions; 'observations' ≠ sessions.
// TODO: per-criterion normalization (distribution-aware) — criteria scores have different
// natural distributions (grammar clusters 0.8–0.95, coherence 0.4–0.7). When enough
// historical data exists, replace (1 - score) with normalize(score, criterion).
type SignalEntry = { observations: number; severitySum: number };
type SignalMap = Record<string, SignalEntry>;

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);
  private readonly textServiceUrl: string;
  private readonly audioServiceUrl: string;

  constructor() {
    this.textServiceUrl = process.env.TEXT_SERVICE_URL || 'http://text-service:4002';
    this.audioServiceUrl = process.env.AUDIO_SERVICE_URL || 'http://audio-service:4003';
  }

  async getStats(language: string, period: Period, userId?: string) {
    const requestedLanguage = language.trim().toUpperCase();
    const normalizedLanguage = this.normalizeLanguage(requestedLanguage);
    const fromDate = this.getFromDate(period);
    const fromParam = fromDate ? fromDate.toISOString() : undefined;

    const [textData, audioData, listeningData] = await Promise.all([
      this.fetchTexts(normalizedLanguage, fromParam, userId),
      this.fetchAudioRecords(normalizedLanguage, fromParam, userId),
      this.fetchListeningScores(normalizedLanguage, fromParam, userId),
    ]);

    const textScores = textData
      .map((t) => t.textScore)
      .filter((s): s is number => typeof s === 'number');

    const readingScores = textData
      .filter((t) => t.skill === 'reading')
      .map((t) => t.textScore)
      .filter((s): s is number => typeof s === 'number');

    const writingScores = textData
      .filter((t) => !t.skill || t.skill !== 'reading')
      .map((t) => t.textScore)
      .filter((s): s is number => typeof s === 'number');

    const audioScores = audioData
      .map((a) => a.pronunciationScore)
      .filter((s): s is number => typeof s === 'number');

    const listeningScores = listeningData
      .map((l) => l.score)
      .filter((s): s is number => typeof s === 'number');

    const avg_text_score =
      textScores.length > 0 ? textScores.reduce((a, b) => a + b, 0) / textScores.length : 0;

    const avg_reading_score =
      readingScores.length > 0 ? readingScores.reduce((a, b) => a + b, 0) / readingScores.length : 0;

    const avg_writing_score =
      writingScores.length > 0 ? writingScores.reduce((a, b) => a + b, 0) / writingScores.length : 0;

    const avg_speaking_score =
      audioScores.length > 0 ? audioScores.reduce((a, b) => a + b, 0) / audioScores.length : 0;

    const avg_listening_score =
      listeningScores.length > 0
        ? listeningScores.reduce((a, b) => a + b, 0) / listeningScores.length
        : 0;

    // Merge speaking + listening for combined avg pronunciation score (backward compat)
    const allAudioScores = [...audioScores, ...listeningScores];
    const avg_pronunciation_score =
      allAudioScores.length > 0
        ? allAudioScores.reduce((a, b) => a + b, 0) / allAudioScores.length
        : 0;

    const { counts: mistakeCountsByType, severity: mistakeSeverityByType } =
      this.buildWeaknessSignals(textData, audioData);
    const mistakesTotal = Object.values(mistakeCountsByType).reduce((sum, v) => sum + v, 0);

    const progressOverTime = this.buildDailyHistory(textData, audioData, listeningData);
    const charts = this.buildFrontendCharts(mistakeCountsByType, progressOverTime);

    return {
      language: requestedLanguage,
      period,
      avg_text_score,
      avg_reading_score,
      avg_writing_score,
      avg_speaking_score,
      avg_listening_score,
      avg_pronunciation_score,
      reading_count: readingScores.length,
      writing_count: writingScores.length,
      speaking_count: audioScores.length,
      listening_count: listeningScores.length,
      mistakes_total: mistakesTotal,
      mistake_counts_by_type: mistakeCountsByType,
      mistake_severity_by_type: mistakeSeverityByType,
      history: progressOverTime,
      charts,
    };
  }

  private async fetchTexts(
    language: string,
    from?: string,
    userId?: string,
  ): Promise<{
    textScore: number | null;
    feedback: string | null;
    createdAt: string;
    skill?: string;
    grammarVocabularyScore: number | null;
    taskAchievementScore: number | null;
    coherenceStructureScore: number | null;
    styleScore: number | null;
  }[]> {
    try {
      const url = new URL(`${this.textServiceUrl}/text/by-language`);
      url.searchParams.set('language', language);
      if (from) url.searchParams.set('from', from);
      if (userId) url.searchParams.set('userId', userId);
      const resp = await fetch(url.toString());
      if (!resp.ok) {
        this.logger.warn(`[fetchTexts] text-service returned ${resp.status} for language=${language}`);
        return [];
      }
      const data = await resp.json() as {
        texts?: {
          textScore: number | null; feedback: string | null; createdAt: string; skill?: string;
          grammarVocabularyScore: number | null; taskAchievementScore: number | null;
          coherenceStructureScore: number | null; styleScore: number | null;
        }[];
      };
      return data?.texts ?? [];
    } catch (err: any) {
      this.logger.warn('could not fetch texts from text-service', err?.message);
      return [];
    }
  }

  private async fetchAudioRecords(
    language: string,
    from?: string,
    userId?: string,
  ): Promise<{ pronunciationScore: number | null; feedback: string | null; createdAt: string }[]> {
    try {
      const url = new URL(`${this.audioServiceUrl}/audio/by-language`);
      url.searchParams.set('language', language);
      if (from) url.searchParams.set('from', from);
      if (userId) url.searchParams.set('userId', userId);
      const resp = await fetch(url.toString());
      if (!resp.ok) {
        this.logger.warn(`[fetchAudioRecords] audio-service returned ${resp.status} for language=${language}`);
        return [];
      }
      const data = await resp.json() as { records?: { pronunciationScore: number | null; feedback: string | null; createdAt: string }[] };
      return data?.records ?? [];
    } catch (err: any) {
      this.logger.warn('could not fetch records from audio-service', err?.message);
      return [];
    }
  }

  private async fetchListeningScores(
    language: string,
    from?: string,
    userId?: string,
  ): Promise<{ score: number; createdAt: string }[]> {
    try {
      const url = new URL(`${this.audioServiceUrl}/audio/listening-by-language`);
      url.searchParams.set('language', language);
      if (from) url.searchParams.set('from', from);
      if (userId) url.searchParams.set('userId', userId);
      const resp = await fetch(url.toString());
      if (!resp.ok) {
        this.logger.warn(`[fetchListeningScores] audio-service returned ${resp.status} for language=${language}`);
        return [];
      }
      const data = await resp.json() as { scores?: { score: number; createdAt: string }[] };
      return data?.scores ?? [];
    } catch (err: any) {
      this.logger.warn('could not fetch listening scores from audio-service', err?.message);
      return [];
    }
  }

  private buildDailyHistory(
    texts: { textScore: number | null; createdAt: string }[],
    audioRecords: { pronunciationScore: number | null; createdAt: string }[],
    listeningScores: { score: number; createdAt: string }[],
  ) {
    const textByDate: Record<string, number[]> = {};
    for (const t of texts) {
      const date = t.createdAt.slice(0, 10);
      if (typeof t.textScore === 'number') {
        (textByDate[date] ??= []).push(t.textScore);
      }
    }

    const audioByDate: Record<string, number[]> = {};
    for (const a of audioRecords) {
      const date = a.createdAt.slice(0, 10);
      if (typeof a.pronunciationScore === 'number') {
        (audioByDate[date] ??= []).push(a.pronunciationScore);
      }
    }
    // Merge listening into the audio bucket (both are audio/comprehension scores)
    for (const l of listeningScores) {
      const date = l.createdAt.slice(0, 10);
      (audioByDate[date] ??= []).push(l.score);
    }

    const allDates = [...new Set([...Object.keys(textByDate), ...Object.keys(audioByDate)])].sort();

    return allDates.map((date) => {
      const ts = textByDate[date];
      const as = audioByDate[date];
      return {
        date,
        text_score: ts ? ts.reduce((a, b) => a + b, 0) / ts.length : 0,
        pronunciation_score: as ? as.reduce((a, b) => a + b, 0) / as.length : 0,
      };
    });
  }

  private buildWeaknessSignals(
    textRows: {
      feedback: string | null;
      grammarVocabularyScore: number | null;
      taskAchievementScore: number | null;
      coherenceStructureScore: number | null;
      styleScore: number | null;
    }[],
    audioRows: { feedback: string | null; pronunciationScore: number | null }[],
  ): { counts: Record<string, number>; severity: Record<string, number> } {
    const map: SignalMap = {};

    const LEGACY_SEVERITY: Record<string, number> = {
      spelling: 0.1, punctuation: 0.1,
      grammar: 0.2, article: 0.15, preposition: 0.15, vocabulary: 0.15,
      pronunciation_major: 0.3, pronunciation_minor: 0.15,
      other: 0.1,
    };

    // Rejects null, undefined, and NaN — the only values safe to pass to (1 - score)
    const isValidScore = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

    const accumulate = (key: string, score: number) => {
      map[key] ??= { observations: 0, severitySum: 0 };
      map[key].observations++;
      map[key].severitySum += (1 - score);
    };

    for (const row of textRows) {
      const gv = isValidScore(row.grammarVocabularyScore);
      const ta = isValidScore(row.taskAchievementScore);
      const cs = isValidScore(row.coherenceStructureScore);
      const st = isValidScore(row.styleScore);

      if (gv || ta || cs || st) {
        // Criteria-based path: continuous signal from structured scores
        if (gv) accumulate('grammar_vocabulary',  row.grammarVocabularyScore as number);
        if (ta) accumulate('task_achievement',    row.taskAchievementScore as number);
        if (cs) accumulate('coherence_structure', row.coherenceStructureScore as number);
        if (st) accumulate('style',               row.styleScore as number);
      } else {
        // Legacy fallback: keyword-parse feedback string
        const feedback = row.feedback?.trim();
        if (!feedback || feedback === 'Great work! No obvious errors detected.') continue;
        for (const part of feedback.split(';').map((p) => p.trim()).filter(Boolean)) {
          const type = this.detectMistakeType(part);
          const legacySeverity = LEGACY_SEVERITY[type] ?? 0.1;
          map[type] ??= { observations: 0, severitySum: 0 };
          map[type].observations++;
          map[type].severitySum += legacySeverity;
        }
      }
    }

    for (const row of audioRows) {
      const fromFeedback = this.detectAudioMistakeType(row.feedback);
      if (fromFeedback) {
        const legacySeverity = LEGACY_SEVERITY[fromFeedback] ?? 0.1;
        map[fromFeedback] ??= { observations: 0, severitySum: 0 };
        map[fromFeedback].observations++;
        map[fromFeedback].severitySum += legacySeverity;
      }

      if (typeof row.pronunciationScore === 'number' && row.pronunciationScore < 0.85) {
        accumulate(
          row.pronunciationScore < 0.7 ? 'pronunciation_major' : 'pronunciation_minor',
          row.pronunciationScore,
        );
      }
    }

    const counts: Record<string, number> = {};
    const severity: Record<string, number> = {};
    for (const [key, entry] of Object.entries(map)) {
      counts[key] = entry.observations;
      severity[key] = entry.severitySum;
    }
    return { counts, severity };
  }

  private detectMistakeType(segment: string): string {
    const normalized = segment.trim().toLowerCase();
    if (!normalized) return 'other';

    const colonIndex = normalized.indexOf(':');
    if (colonIndex > 0) {
      const raw = normalized.slice(0, colonIndex).trim();
      if (raw) return raw.replace(/\s+/g, '_');
    }

    if (normalized.includes('spell')) return 'spelling';
    if (normalized.includes('punctuation') || normalized.includes('question mark')) return 'punctuation';
    if (normalized.includes('grammar') || normalized.includes('tense')) return 'grammar';
    if (normalized.includes('preposition')) return 'preposition';
    if (normalized.includes('article')) return 'article';
    if (normalized.includes('vocab')) return 'vocabulary';

    return 'other';
  }

  private detectAudioMistakeType(feedback: string | null): string | null {
    if (!feedback) return null;
    const n = feedback.toLowerCase();
    if (n.includes('excellent pronunciation')) return null;
    if (n.includes('good pronunciation')) return 'pronunciation_minor';
    if (n.includes('acceptable pronunciation')) return 'pronunciation_minor';
    if (n.includes('pronunciation')) return 'pronunciation_major';
    return null;
  }

  private buildFrontendCharts(
    mistakeCountsByType: Record<string, number>,
    progressOverTime: Array<{ date: string; text_score: number; pronunciation_score: number }>,
  ) {
    const sortedMistakes = Object.entries(mistakeCountsByType).sort((a, b) => b[1] - a[1]);
    return {
      mistakesByType: {
        labels: sortedMistakes.map(([label]) => label),
        values: sortedMistakes.map(([, value]) => value),
      },
      progressOverTime: {
        labels: progressOverTime.map((p) => p.date),
        textScores: progressOverTime.map((p) => p.text_score),
        pronunciationScores: progressOverTime.map((p) => p.pronunciation_score),
      },
    };
  }

  private getFromDate(period: Period): Date | null {
    const now = new Date();
    if (period === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    if (period === 'month') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    return null;
  }

  private normalizeLanguage(input: string): string {
    const value = input.trim().toLowerCase();
    const aliases: Record<string, string> = {
      en: 'english', english: 'english',
      es: 'spanish', spanish: 'spanish',
      de: 'german',  german: 'german',
      fr: 'french',  french: 'french',
      it: 'italian', italian: 'italian',
      uk: 'ukrainian', ua: 'ukrainian', ukrainian: 'ukrainian',
      pl: 'polish',  polish: 'polish',
    };
    return aliases[value] ?? value;
  }
}
