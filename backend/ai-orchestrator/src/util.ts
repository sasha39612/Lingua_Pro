import { Logger } from '@nestjs/common';
import type { WordAlignment, WordDetail } from './types';

// ── Phoneme map (ARPABET → IPA + articulation) ────────────────────────────────
// English uses ARPABET notation from Azure. Other languages use IPA-like symbols.
// Used to enrich phoneme context sent to GPT so it can give specific coaching.

export const PHONEME_MAP: Record<string, { ipa: string; description: string; example: string; articulation: string }> = {
  // ── English vowels (ARPABET) ───────────────────────────────────────────────
  AA: { ipa: 'ɑː', description: 'open back unrounded vowel', example: 'father', articulation: 'open mouth wide, tongue low and pulled back' },
  AE: { ipa: 'æ', description: 'near-open front unrounded vowel', example: 'cat', articulation: 'spread lips, tongue forward and low, jaw dropped' },
  AH: { ipa: 'ʌ', description: 'open-mid back unrounded vowel', example: 'cup', articulation: 'relax jaw and lips, tongue slightly back and low' },
  AO: { ipa: 'ɔː', description: 'open-mid back rounded vowel', example: 'law', articulation: 'round your lips and open your mouth slightly' },
  AW: { ipa: 'aʊ', description: 'diphthong from /a/ to /ʊ/', example: 'mouth', articulation: 'start with open mouth then glide lips to a rounded position' },
  AY: { ipa: 'aɪ', description: 'diphthong from /a/ to /ɪ/', example: 'price', articulation: 'start with open mouth then raise tongue toward front' },
  EH: { ipa: 'ɛ', description: 'open-mid front unrounded vowel', example: 'dress', articulation: 'slightly open mouth, tongue forward and mid-height' },
  ER: { ipa: 'ɜː', description: 'open-mid central vowel (r-coloured)', example: 'nurse', articulation: 'curl tongue slightly back without touching the roof, lips relaxed' },
  EY: { ipa: 'eɪ', description: 'diphthong from /e/ to /ɪ/', example: 'face', articulation: 'start with tongue mid-front then glide upward' },
  IH: { ipa: 'ɪ', description: 'near-close near-front unrounded vowel', example: 'kit', articulation: 'tongue high and forward, lips spread slightly — shorter than /iː/' },
  IY: { ipa: 'iː', description: 'close front unrounded vowel', example: 'fleece', articulation: 'tongue high and fully forward, lips spread wide' },
  OW: { ipa: 'oʊ', description: 'diphthong from /o/ to /ʊ/', example: 'goat', articulation: 'start with rounded lips then glide to a tighter rounding' },
  OY: { ipa: 'ɔɪ', description: 'diphthong from /ɔ/ to /ɪ/', example: 'choice', articulation: 'start with rounded open lips then glide tongue forward' },
  UH: { ipa: 'ʊ', description: 'near-close near-back rounded vowel', example: 'foot', articulation: 'round lips loosely, tongue high and slightly back — shorter than /uː/' },
  UW: { ipa: 'uː', description: 'close back rounded vowel', example: 'goose', articulation: 'round lips tightly, tongue high and back' },
  // ── English consonants (ARPABET) ──────────────────────────────────────────
  B:  { ipa: 'b', description: 'voiced bilabial plosive', example: 'bag', articulation: 'press both lips together then release with voice' },
  CH: { ipa: 'tʃ', description: 'voiceless palato-alveolar affricate', example: 'church', articulation: 'tongue tip to the ridge behind teeth, release air sharply without voice' },
  D:  { ipa: 'd', description: 'voiced alveolar plosive', example: 'dog', articulation: 'tongue tip to ridge behind teeth, release with voice' },
  DH: { ipa: 'ð', description: 'voiced dental fricative', example: 'this', articulation: 'place tongue lightly between teeth and vibrate — do NOT use /d/' },
  F:  { ipa: 'f', description: 'voiceless labiodental fricative', example: 'fish', articulation: 'upper teeth gently on lower lip, blow air without voice' },
  G:  { ipa: 'ɡ', description: 'voiced velar plosive', example: 'get', articulation: 'back of tongue to soft palate, release with voice' },
  HH: { ipa: 'h', description: 'voiceless glottal fricative', example: 'hat', articulation: 'open throat and exhale a gentle breath before the vowel' },
  JH: { ipa: 'dʒ', description: 'voiced palato-alveolar affricate', example: 'judge', articulation: 'tongue tip to ridge behind teeth, release with voice and buzz' },
  K:  { ipa: 'k', description: 'voiceless velar plosive', example: 'cat', articulation: 'back of tongue to soft palate, release with a puff of air' },
  L:  { ipa: 'l', description: 'voiced alveolar lateral approximant', example: 'leg', articulation: 'tongue tip to the ridge, let air flow around the sides' },
  M:  { ipa: 'm', description: 'voiced bilabial nasal', example: 'man', articulation: 'press lips together and hum through the nose' },
  N:  { ipa: 'n', description: 'voiced alveolar nasal', example: 'not', articulation: 'tongue tip to ridge behind teeth, hum through the nose' },
  NG: { ipa: 'ŋ', description: 'voiced velar nasal', example: 'sing', articulation: 'back of tongue to soft palate, hum through the nose — no /g/ at end' },
  P:  { ipa: 'p', description: 'voiceless bilabial plosive', example: 'pet', articulation: 'press both lips together, release with a puff of air — no voice' },
  R:  { ipa: 'r', description: 'voiced alveolar approximant', example: 'red', articulation: 'curl tongue tip slightly back, do NOT touch the roof of the mouth' },
  S:  { ipa: 's', description: 'voiceless alveolar fricative', example: 'sit', articulation: 'tongue near the ridge, blow a sharp hissing stream of air' },
  SH: { ipa: 'ʃ', description: 'voiceless palato-alveolar fricative', example: 'ship', articulation: 'tongue pulled slightly back, round lips gently and hiss' },
  T:  { ipa: 't', description: 'voiceless alveolar plosive', example: 'top', articulation: 'tongue tip to ridge behind teeth, release with a puff of air — no voice' },
  TH: { ipa: 'θ', description: 'voiceless dental fricative', example: 'think', articulation: 'place tongue lightly between teeth and blow air — do NOT use /f/ or /t/' },
  V:  { ipa: 'v', description: 'voiced labiodental fricative', example: 'van', articulation: 'upper teeth gently on lower lip, blow air WITH voice — contrast with /f/' },
  W:  { ipa: 'w', description: 'voiced labial-velar approximant', example: 'wet', articulation: 'round lips tightly then open smoothly into the following vowel' },
  Y:  { ipa: 'j', description: 'voiced palatal approximant', example: 'yes', articulation: 'tongue close to hard palate, glide smoothly into the vowel' },
  Z:  { ipa: 'z', description: 'voiced alveolar fricative', example: 'zoo', articulation: 'same as /s/ but add voice — feel the buzz in your throat' },
  ZH: { ipa: 'ʒ', description: 'voiced palato-alveolar fricative', example: 'measure', articulation: 'same as /ʃ/ but add voice — the middle sound in "vision"' },
  // ── German phonemes ────────────────────────────────────────────────────────
  // Vowels
  'ø':   { ipa: 'ø',  description: 'close-mid front rounded vowel (ö)', example: 'schön', articulation: 'shape lips for /o/ but try to say /e/ — lips rounded, tongue forward' },
  'y':   { ipa: 'y',  description: 'close front rounded vowel (ü)', example: 'über', articulation: 'shape lips for /u/ but try to say /i/ — lips tight and rounded, tongue forward' },
  'œ':   { ipa: 'œ',  description: 'open-mid front rounded vowel (short ö)', example: 'zwölf', articulation: 'like /ø/ but shorter and more open, mouth slightly more open' },
  'ʏ':   { ipa: 'ʏ',  description: 'near-close near-front rounded vowel (short ü)', example: 'hübsch', articulation: 'like /y/ but shorter and more relaxed, lips less tight' },
  'aɪ':  { ipa: 'aɪ', description: 'diphthong from /a/ to /ɪ/ (ai/ei)', example: 'mein', articulation: 'start with open mouth, glide tongue high and forward' },
  'aʊ':  { ipa: 'aʊ', description: 'diphthong from /a/ to /ʊ/ (au)', example: 'Haus', articulation: 'start with open mouth, glide lips into rounded position' },
  'ɔʏ':  { ipa: 'ɔʏ', description: 'diphthong from /ɔ/ to /ʏ/ (eu/äu)', example: 'neu', articulation: 'start with rounded open lips, glide tongue forward and up' },
  // Consonants
  'ç':   { ipa: 'ç',  description: 'voiceless palatal fricative (ich-Laut)', example: 'ich', articulation: 'tongue near hard palate, force air through a narrow gap — no buzzing' },
  'x':   { ipa: 'x',  description: 'voiceless velar fricative (ach-Laut)', example: 'Bach', articulation: 'back of tongue near soft palate, scrape air through — deeper than ich-Laut' },
  'ʁ':   { ipa: 'ʁ',  description: 'voiced uvular fricative/trill (German r)', example: 'rot', articulation: 'vibrate the uvula (back of throat) or pull tongue back slightly — do NOT use English /r/' },
  'ŋ_de':{ ipa: 'ŋ',  description: 'voiced velar nasal (ng)', example: 'singen', articulation: 'back of tongue to soft palate, hum through nose — no /g/ sound at the end' },
  'ts_de':{ ipa: 'ts', description: 'voiceless alveolar affricate (z)', example: 'Zeit', articulation: 'tongue tip to ridge, release as a sharp /ts/ — German z is never like English z' },
  // ── Polish phonemes ────────────────────────────────────────────────────────
  // Unique Polish phonemes (IPA keys match what Azure returns)
  'ɕ':   { ipa: 'ɕ',  description: 'voiceless alveolo-palatal fricative (ś)', example: 'śpi', articulation: 'tongue tip down, middle of tongue near hard palate, hiss forward — softer than /ʃ/' },
  'ʑ':   { ipa: 'ʑ',  description: 'voiced alveolo-palatal fricative (ź)', example: 'źródło', articulation: 'same as /ɕ/ but add voice — buzz while hissing forward' },
  'ɲ':   { ipa: 'ɲ',  description: 'voiced palatal nasal (ń/nj)', example: 'koń', articulation: 'tongue blade to hard palate, hum through nose — softer and further back than /n/' },
  'ɛ̃':   { ipa: 'ɛ̃',  description: 'nasalized open-mid front vowel (ę)', example: 'zęb', articulation: 'say /ɛ/ while letting air flow gently through the nose — light nasal resonance' },
  'ɔ̃':   { ipa: 'ɔ̃',  description: 'nasalized open-mid back rounded vowel (ą)', example: 'rąk', articulation: 'round lips and open mouth, let air flow through the nose — like /ɔ/ but nasalized' },
  'ʂ':   { ipa: 'ʂ',  description: 'voiceless retroflex fricative (sz)', example: 'szum', articulation: 'curl tongue tip slightly back, hiss — harder and darker than /ɕ/' },
  'ʐ':   { ipa: 'ʐ',  description: 'voiced retroflex fricative (ż/rz)', example: 'żaba', articulation: 'same as /ʂ/ but add voice — buzz with curled-back tongue' },
  'ɨ_pl':{ ipa: 'ɨ',  description: 'close central unrounded vowel (y)', example: 'my', articulation: 'tongue high and slightly back, lips neutral — between /i/ and /u/' },
  'ɫ':   { ipa: 'ɫ',  description: 'velarized alveolar lateral (ł)', example: 'mało', articulation: 'like English /w/ — round lips slightly and pull tongue back, no tongue-to-ridge contact' },
  // ── Albanian phonemes ─────────────────────────────────────────────────────
  // Unique Albanian phonemes (IPA keys)
  'ə':   { ipa: 'ə',  description: 'mid-central schwa (ë)', example: 'bërë', articulation: 'tongue relaxed in the center of the mouth, lips neutral — the most unstressed vowel possible' },
  'ɟ':   { ipa: 'ɟ',  description: 'voiced palatal plosive (gj)', example: 'gjithë', articulation: 'tongue body pressed to hard palate, release with voice — like /g/ but further forward' },
  'c_al':{ ipa: 'c',  description: 'voiceless palatal plosive (q)', example: 'qytet', articulation: 'tongue body to hard palate, release sharply without voice — like /k/ but further forward' },
  'rː':  { ipa: 'rː', description: 'long alveolar trill (rr)', example: 'rrugë', articulation: 'trill tongue tip against the alveolar ridge longer and stronger than single /r/' },
  'dz':  { ipa: 'dz', description: 'voiced alveolar affricate (x)', example: 'xham', articulation: 'tongue tip to ridge, release with voice into a buzz — /d/ + /z/ as one sound' },
  // Digraph keys (grapheme-based, for reference)
  'dh_al':{ ipa: 'ð', description: 'voiced dental fricative (dh)', example: 'dhëmb', articulation: 'tongue lightly between teeth, vibrate with voice — same as English "this"' },
  'll_al':{ ipa: 'ɫ', description: 'velarized alveolar lateral (ll)', example: 'yll', articulation: 'tongue tip to ridge, back of tongue raised toward soft palate — darker than /l/' },
  'nj_al':{ ipa: 'ɲ', description: 'voiced palatal nasal (nj)', example: 'një', articulation: 'tongue blade to hard palate, hum through nose' },
  'rr_al':{ ipa: 'rː',description: 'long alveolar trill (rr)', example: 'rrugë', articulation: 'trill tongue tip longer and stronger than single /r/' },
  'sh_al':{ ipa: 'ʃ', description: 'voiceless palato-alveolar fricative (sh)', example: 'shkollë', articulation: 'tongue back slightly, round lips gently, hiss' },
  'th_al':{ ipa: 'θ', description: 'voiceless dental fricative (th)', example: 'thikë', articulation: 'tongue lightly between teeth, blow air sharply — same as English "think"' },
  'xh_al':{ ipa: 'dʒ',description: 'voiced palato-alveolar affricate (xh)', example: 'xhiro', articulation: 'tongue tip to ridge, release with voice and buzz — same as English "judge"' },
  'zh_al':{ ipa: 'ʒ', description: 'voiced palato-alveolar fricative (zh)', example: 'zhurmë', articulation: 'same as /ʃ/ but add voice — the sound in English "measure"' },
  // ── Ukrainian phonemes ────────────────────────────────────────────────────
  // Common IPA vowels (shared across Ukrainian / German / Albanian / Polish)
  'a':   { ipa: 'a',  description: 'open front unrounded vowel', example: 'мама / mal / Mann / tak', articulation: 'open mouth wide, tongue low and forward' },
  'e':   { ipa: 'ɛ',  description: 'open-mid front unrounded vowel', example: 'мел / zemër / Bär / len', articulation: 'slightly open mouth, tongue forward and mid-height' },
  'i':   { ipa: 'i',  description: 'close front unrounded vowel', example: 'син / bir / mit / mi', articulation: 'tongue high and fully forward, lips spread' },
  'o':   { ipa: 'ɔ',  description: 'open-mid back rounded vowel', example: 'молоко / dorë / dom', articulation: 'rounded lips, tongue mid-back' },
  'u':   { ipa: 'u',  description: 'close back rounded vowel', example: 'вул / udhë / gut / lubi', articulation: 'round lips tightly, tongue high and back' },
  'ɨ':   { ipa: 'ɨ',  description: 'close central unrounded vowel (и/y)', example: 'синь (sɨnʲ)', articulation: 'tongue high and slightly back, lips neutral — between /i/ and /u/' },
  // Ukrainian-specific consonants (IPA keys used by Azure for uk-UA)
  'ɦ':   { ipa: 'ɦ',  description: 'voiced glottal fricative (г)', example: 'хата (ɦata)', articulation: 'breathy sound from the throat — vocal cords vibrate loosely, unlike English /h/' },
  'ts':  { ipa: 'ts', description: 'voiceless alveolar affricate (ц/c)', example: 'цукор (tsukor)', articulation: 'tongue tip to ridge, release as a sharp /ts/ — one quick combined sound' },
  'tʃ':  { ipa: 'tʃ', description: 'voiceless palato-alveolar affricate (ч/ç)', example: 'чотири (tʃotɪrɪ)', articulation: 'tongue tip to ridge, release with a puff of air — no voice' },
  'dʒ':  { ipa: 'dʒ', description: 'voiced palato-alveolar affricate (дж/xh)', example: 'джем (dʒem)', articulation: 'tongue tip to ridge, release with voice and buzz' },
}

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
    ukrainian: 'uk-UA',
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
  if (lang.includes('ukrainian')) return ['/ɦ/ (voiced г) vs /x/ (х)', 'trilled /r/ every time', '/ɨ/ (и) — tongue back, lips neutral', 'soft consonants with ь (palatalisation)'];
  return ['consonant clarity', 'vowel length', 'word stress'];
}

// Converts a raw Azure phoneme symbol + accuracy score into a rich coaching string.
// Example: enrichPhonemeContext('AO', 45)
//   → '/ɔː/ (open-mid back rounded vowel, e.g. "law") scored 45% — round your lips and open your mouth slightly'
export function enrichPhonemeContext(phoneme: string, score: number): string {
  const info = PHONEME_MAP[phoneme];
  if (!info) return `/${phoneme}/ scored ${score}%`;
  return `/${info.ipa}/ (${info.description}, e.g. "${info.example}") scored ${score}% — ${info.articulation}`;
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

// ── Edit distance (used by per-word fallback scoring) ─────────────────────────
// Unicode-aware character-level Levenshtein distance.

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

// Returns 0..1 where 1 = identical, 0 = completely different.
// Works correctly with non-Latin scripts (Cyrillic, Arabic, etc.).
export function normalizedEditDistance(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const dist = levenshteinDistance(a, b);
  return Math.max(0, 1 - dist / Math.max(a.length, b.length));
}

function toTokens(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // Unicode-aware: keeps Cyrillic, Arabic, CJK, etc.
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
  return text.replace(/[^\p{L}\p{N}\s]/gu, ''); // Unicode-aware: preserves non-Latin scripts
}
