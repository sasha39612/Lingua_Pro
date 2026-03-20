import { Injectable, Logger } from '@nestjs/common';
import { spawnSync } from 'child_process';

// Languages supported by espeak-ng for G2P fallback.
// Note: Azure Pronunciation Assessment supports English, German, French, Spanish etc.
// but NOT Polish, Ukrainian, or Albanian — those rely entirely on this G2P service.
const ESPEAK_LANG: Record<string, string> = {
  english:   'en',
  german:    'de',
  polish:    'pl',
  ukrainian: 'uk',
  albanian:  'sq',
};

// Common IPA affricate pairs that espeak-ng writes as two grapheme clusters
// but represent a single phoneme. We merge these during tokenisation.
const AFFRICATES = new Set(['tʃ', 'dʒ', 'ts', 'dz', 'tɕ', 'dʑ', 'tʂ', 'dʐ']);

export type PhonemeDiff = {
  score: number;          // 0..1 — phoneme-level accuracy for the word pair
  errorPhonemes: string[]; // expected phonemes that were absent or substituted
};

@Injectable()
export class G2pService {
  private readonly logger = new Logger(G2pService.name);
  private espeakAvailable = false;
  // Intl.Segmenter splits IPA strings into grapheme clusters so that
  // combining diacritics (ɔ̃, kʲ) stay attached to their base character.
  private readonly segmenter = new Intl.Segmenter('und', { granularity: 'grapheme' });

  constructor() {
    this.probe();
  }

  isAvailable(): boolean {
    return this.espeakAvailable;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  // Convert a single word to an IPA string.
  // Returns empty string when espeak-ng is unavailable or the language isn't supported.
  wordToIpa(word: string, language: string): string {
    if (!this.espeakAvailable) return '';
    const lang = ESPEAK_LANG[language.toLowerCase()];
    if (!lang) return '';

    const res = spawnSync(
      'espeak-ng',
      ['-q', '--ipa', '-v', lang, word.toLowerCase()],
      { encoding: 'utf8', timeout: 3_000, stdio: 'pipe' },
    );

    if (res.status !== 0 || !res.stdout) return '';

    return res.stdout
      .replace(/[ˈˌ_\n]/g, '') // strip stress markers and line breaks
      .trim();
  }

  // Compare an expected word against a spoken word at the phoneme level.
  // Uses espeak-ng to get IPA for each, then runs Levenshtein on the phoneme arrays.
  // Falls back to empty diff when G2P is unavailable.
  diffWords(expectedWord: string, spokenWord: string, language: string): PhonemeDiff {
    if (!this.espeakAvailable) return { score: 1, errorPhonemes: [] };

    const expectedIpa = this.wordToIpa(expectedWord, language);
    const spokenIpa   = this.wordToIpa(spokenWord,   language);

    if (!expectedIpa) return { score: 1, errorPhonemes: [] };

    const refPhonemes    = this.splitIpa(expectedIpa);
    const spokenPhonemes = this.splitIpa(spokenIpa);

    if (refPhonemes.length === 0) return { score: 1, errorPhonemes: [] };

    const dp = this.buildDp(refPhonemes, spokenPhonemes);
    const dist = dp[refPhonemes.length][spokenPhonemes.length];
    const score = Math.max(0, 1 - dist / refPhonemes.length);

    const errorPhonemes = this.traceback(dp, refPhonemes, spokenPhonemes);
    return { score, errorPhonemes };
  }

  // ── IPA tokenisation ────────────────────────────────────────────────────────

  // Split an IPA string into individual phoneme tokens.
  // Handles:
  //   - Combining diacritics: ɔ̃, kʲ — stay with their base via Intl.Segmenter
  //   - Common affricates: tʃ, dʒ, ts, dz, tɕ, dʑ, tʂ, dʐ — merged into one token
  splitIpa(ipa: string): string[] {
    const clusters = [...this.segmenter.segment(ipa)].map((s) => s.segment);
    const tokens: string[] = [];

    for (let i = 0; i < clusters.length; i++) {
      const pair = clusters[i] + (clusters[i + 1] ?? '');
      if (AFFRICATES.has(pair)) {
        tokens.push(pair);
        i++; // consume next cluster too
      } else {
        tokens.push(clusters[i]);
      }
    }

    return tokens.filter(Boolean);
  }

  // ── Levenshtein internals ───────────────────────────────────────────────────

  private buildDp(ref: string[], spoken: string[]): number[][] {
    const m = ref.length;
    const n = spoken.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
    );
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          ref[i - 1] === spoken[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
    return dp;
  }

  // Traceback through the DP table to collect expected phonemes that were
  // substituted or missing (the ones GPT should coach the student on).
  private traceback(dp: number[][], ref: string[], spoken: string[]): string[] {
    const errors: string[] = [];
    let i = ref.length;
    let j = spoken.length;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && ref[i - 1] === spoken[j - 1]) {
        i--; j--; // match — no error
      } else if (
        j > 0 &&
        (i === 0 || dp[i][j - 1] <= dp[i - 1][j] && dp[i][j - 1] <= dp[i - 1][j - 1])
      ) {
        j--; // insertion — extra spoken phoneme, not an error in the reference
      } else if (
        i > 0 &&
        (j === 0 || dp[i - 1][j] < dp[i][j - 1])
      ) {
        errors.unshift(ref[i - 1]); // deletion — missing phoneme
        i--;
      } else {
        errors.unshift(ref[i - 1]); // substitution — wrong phoneme
        i--;
        if (j > 0) j--;
      }
    }

    return errors;
  }

  // ── Startup probe ───────────────────────────────────────────────────────────

  private probe(): void {
    const res = spawnSync('espeak-ng', ['--version'], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    this.espeakAvailable = res.status === 0;
    if (this.espeakAvailable) {
      this.logger.log('espeak-ng available — G2P phoneme analysis enabled');
    } else {
      this.logger.warn(
        'espeak-ng not found — G2P disabled; install espeak-ng for phoneme-level fallback',
      );
    }
  }
}
