import { Injectable, Logger } from '@nestjs/common';

type Period = 'week' | 'month' | 'all';

type MistakeCounts = Record<string, number>;

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);
  private readonly textServiceUrl: string;
  private readonly audioServiceUrl: string;

  constructor() {
    this.textServiceUrl = process.env.TEXT_SERVICE_URL || 'http://text-service:4002';
    this.audioServiceUrl = process.env.AUDIO_SERVICE_URL || 'http://audio-service:4003';
  }

  async getStats(language: string, period: Period) {
    const requestedLanguage = language.trim().toUpperCase();
    const normalizedLanguage = this.normalizeLanguage(requestedLanguage);
    const fromDate = this.getFromDate(period);
    const fromParam = fromDate ? fromDate.toISOString() : undefined;

    const [textData, audioData] = await Promise.all([
      this.fetchTexts(normalizedLanguage, fromParam),
      this.fetchAudioRecords(normalizedLanguage, fromParam),
    ]);

    const textScores = textData
      .map((t) => t.textScore)
      .filter((s): s is number => typeof s === 'number');

    const audioScores = audioData
      .map((a) => a.pronunciationScore)
      .filter((s): s is number => typeof s === 'number');

    const avg_text_score =
      textScores.length > 0 ? textScores.reduce((a, b) => a + b, 0) / textScores.length : 0;

    const avg_pronunciation_score =
      audioScores.length > 0
        ? audioScores.reduce((a, b) => a + b, 0) / audioScores.length
        : 0;

    const mistakeCountsByType = this.buildMistakeCountsByType(textData, audioData);
    const mistakesTotal = Object.values(mistakeCountsByType).reduce((sum, v) => sum + v, 0);

    const progressOverTime = this.buildDailyHistory(textData, audioData);
    const charts = this.buildFrontendCharts(mistakeCountsByType, progressOverTime);

    return {
      language: requestedLanguage,
      period,
      avg_text_score,
      avg_pronunciation_score,
      mistakes_total: mistakesTotal,
      mistake_counts_by_type: mistakeCountsByType,
      history: progressOverTime,
      charts,
    };
  }

  private async fetchTexts(
    language: string,
    from?: string,
  ): Promise<{ textScore: number | null; feedback: string | null; createdAt: string }[]> {
    try {
      const url = new URL(`${this.textServiceUrl}/text/by-language`);
      url.searchParams.set('language', language);
      if (from) url.searchParams.set('from', from);
      const resp = await fetch(url.toString());
      const data = await resp.json() as { texts?: { textScore: number | null; feedback: string | null; createdAt: string }[] };
      return data?.texts ?? [];
    } catch (err: any) {
      this.logger.warn('could not fetch texts from text-service', err?.message);
      return [];
    }
  }

  private async fetchAudioRecords(
    language: string,
    from?: string,
  ): Promise<{ pronunciationScore: number | null; feedback: string | null; createdAt: string }[]> {
    try {
      const url = new URL(`${this.audioServiceUrl}/audio/by-language`);
      url.searchParams.set('language', language);
      if (from) url.searchParams.set('from', from);
      const resp = await fetch(url.toString());
      const data = await resp.json() as { records?: { pronunciationScore: number | null; feedback: string | null; createdAt: string }[] };
      return data?.records ?? [];
    } catch (err: any) {
      this.logger.warn('could not fetch records from audio-service', err?.message);
      return [];
    }
  }

  private buildDailyHistory(
    texts: { textScore: number | null; createdAt: string }[],
    audioRecords: { pronunciationScore: number | null; createdAt: string }[],
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

  private buildMistakeCountsByType(
    textRows: { feedback: string | null }[],
    audioRows: { feedback: string | null; pronunciationScore: number | null }[],
  ): MistakeCounts {
    const counts: MistakeCounts = {};

    for (const row of textRows) {
      const feedback = row.feedback?.trim();
      if (!feedback || feedback === 'Great work! No obvious errors detected.') continue;

      for (const part of feedback.split(';').map((p) => p.trim()).filter(Boolean)) {
        const type = this.detectMistakeType(part);
        counts[type] = (counts[type] ?? 0) + 1;
      }
    }

    for (const row of audioRows) {
      const fromFeedback = this.detectAudioMistakeType(row.feedback);
      if (fromFeedback) counts[fromFeedback] = (counts[fromFeedback] ?? 0) + 1;

      if (typeof row.pronunciationScore === 'number' && row.pronunciationScore < 0.85) {
        const type = row.pronunciationScore < 0.7 ? 'pronunciation_major' : 'pronunciation_minor';
        counts[type] = (counts[type] ?? 0) + 1;
      }
    }

    return counts;
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
    mistakeCountsByType: MistakeCounts,
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
