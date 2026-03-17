import { Logger } from '@nestjs/common';
import type { WordAlignment, WordDetail } from './types';

// ── JSON ──────────────────────────────────────────────────────────────────────

export function safeJsonParse<T>(input: string): T {
  try {
    return JSON.parse(input) as T;
  } catch {
    return {} as T;
  }
}

// ── Scores ────────────────────────────────────────────────────────────────────

export function normalizeScore(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

// ── Base64 / audio ────────────────────────────────────────────────────────────

export function decodeBase64(data: string): Buffer | null {
  if (!data || typeof data !== 'string') return null;
  const payload = data.includes(',') ? data.split(',')[1] : data;
  try {
    return Buffer.from(payload, 'base64');
  } catch {
    return null;
  }
}

export function mimeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/ogg': 'ogg',
  };
  return map[mimeType] || 'webm';
}

export function mapLanguageToLocale(language: string): string {
  const map: Record<string, string> = {
    english: 'en-US',
    german: 'de-DE',
    polish: 'pl-PL',
    albanian: 'sq-AL',
  };
  return map[language.toLowerCase()] ?? 'en-US';
}

export function mapLanguageToCode(language: string): string {
  const map: Record<string, string> = {
    english: 'en',
    german: 'de',
    polish: 'pl',
    albanian: 'sq',
    spanish: 'es',
    french: 'fr',
    portuguese: 'pt',
    italian: 'it',
    dutch: 'nl',
    russian: 'ru',
    chinese: 'zh',
    japanese: 'ja',
    korean: 'ko',
    arabic: 'ar',
    hindi: 'hi',
    turkish: 'tr',
    vietnamese: 'vi',
    thai: 'th',
    swedish: 'sv',
    norwegian: 'no',
    danish: 'da',
    finnish: 'fi',
    czech: 'cs',
    romanian: 'ro',
    greek: 'el',
    hebrew: 'he',
    indonesian: 'id',
    ukrainian: 'uk',
  };
  return map[language.toLowerCase()] ?? 'en';
}

export function phonemeHintsByLanguage(language: string): string[] {
  const lang = language.toLowerCase();
  if (lang.includes('english')) return ['/th/ in "think"', '/w/ vs /v/', 'final consonant release'];
  if (lang.includes('german')) return ['ich-Laut /ç/', 'ach-Laut /x/', 'umlaut clarity (ä/ö/ü)'];
  if (lang.includes('polish')) return ['sz/sh contrast', 'cz/ch contrast', 'nasal vowels timing'];
  if (lang.includes('albanian')) return ['ll vs l distinction', 'r vs rr trilling', 'clear final vowels'];
  return ['consonant clarity', 'vowel length', 'word stress'];
}

// ── Async utilities ───────────────────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  logger: Logger,
  attempts = 3,
  baseMs = 400,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const waitMs = baseMs * Math.pow(2, attempt - 1);
      logger.warn(`${label}: attempt ${attempt} failed, retrying in ${waitMs}ms`);
      await sleep(waitMs);
    }
  }
  throw lastError;
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => { clearTimeout(timer); resolve(value); })
      .catch((error) => { clearTimeout(timer); reject(error); });
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Text similarity (used by local fallbacks) ─────────────────────────────────

export function tokenSimilarity(source: string, target: string): number {
  const src = toTokens(source);
  const tgt = toTokens(target);
  if (src.length === 0 || tgt.length === 0) return 0.4;
  const srcSet = new Set(src);
  const tgtSet = new Set(tgt);
  let overlap = 0;
  for (const token of srcSet) {
    if (tgtSet.has(token)) overlap++;
  }
  return overlap / Math.max(srcSet.size, tgtSet.size);
}

function toTokens(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// ── Word alignment (token-level Levenshtein) ──────────────────────────────────
// Aligns referenceText tokens against spoken WordDetail[] to produce WordAlignment[].
// Powers the FE speaking UI: correct / missing / extra / mispronounced per word.

export function computeWordAlignment(
  referenceText: string,
  words: WordDetail[],
): WordAlignment[] {
  const refTokens = stripPunctuation(referenceText)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const spokenTokens = words.map((w) => w.word.toLowerCase());

  if (refTokens.length === 0 && spokenTokens.length === 0) return [];

  // Build edit-distance matrix (rows = refTokens, cols = spokenTokens)
  const m = refTokens.length;
  const n = spokenTokens.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (refTokens[i - 1] === spokenTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Traceback
  const alignment: WordAlignment[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && refTokens[i - 1] === spokenTokens[j - 1]) {
      // Match — correct or check Azure errorType
      const wd = words[j - 1];
      const isMispronounced = wd?.errorType === 'Mispronunciation';
      alignment.unshift({
        expected: refTokens[i - 1],
        spoken: spokenTokens[j - 1],
        type: isMispronounced ? 'mispronounced' : 'correct',
        wordDetail: wd,
      });
      i--;
      j--;
    } else if (
      j > 0 &&
      (i === 0 || dp[i][j - 1] <= dp[i - 1][j] && dp[i][j - 1] <= dp[i - 1][j - 1])
    ) {
      // Insertion — extra spoken word
      alignment.unshift({
        expected: spokenTokens[j - 1],
        spoken: spokenTokens[j - 1],
        type: 'extra',
        wordDetail: words[j - 1],
      });
      j--;
    } else if (
      i > 0 &&
      (j === 0 || dp[i - 1][j] <= dp[i][j - 1] && dp[i - 1][j] <= dp[i - 1][j - 1])
    ) {
      // Deletion — missing reference word
      alignment.unshift({
        expected: refTokens[i - 1],
        spoken: null,
        type: 'missing',
      });
      i--;
    } else {
      // Substitution — mispronounced (different word)
      const wd = words[j - 1];
      alignment.unshift({
        expected: refTokens[i - 1],
        spoken: spokenTokens[j - 1],
        type: 'mispronounced',
        wordDetail: wd,
      });
      i--;
      j--;
    }
  }

  return alignment;
}

function stripPunctuation(text: string): string {
  return text.replace(/[^\w\s]/g, '');
}
