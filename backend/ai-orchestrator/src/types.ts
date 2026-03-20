// ── Phoneme & Word detail (from Azure Speech SDK) ─────────────────────────────

export type PhonemeDetail = {
  phoneme: string;       // IPA symbol e.g. "θ", "æ"
  accuracyScore: number; // 0..100 (Azure native scale)
  offset: number;        // ms from utterance start (converted from 100ns ticks ÷ 10000)
  duration: number;      // ms
};

export type WordDetail = {
  word: string;
  accuracyScore: number; // 0..100 (Azure native scale)
  errorType: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation';
  phonemes: PhonemeDetail[];
};

// ── Word alignment (computed post-Azure via token-level Levenshtein) ───────────
// This is what drives the FE speaking UI: correct/missing/extra/mispronounced

export type G2pHints = {
  expectedIpa: string[];  // IPA phoneme sequence of the reference word (from espeak-ng)
  spokenIpa: string[];    // IPA phoneme sequence of the spoken word (from espeak-ng)
  errorPhonemes: string[]; // reference phonemes absent or substituted in the spoken form
};

export type WordAlignment = {
  expected: string;        // word from referenceText (stripped of punctuation)
  spoken: string | null;   // null when word was missing
  type: 'correct' | 'missing' | 'extra' | 'mispronounced';
  wordDetail?: WordDetail; // Azure phoneme data when phonemeSource === 'acoustic'
  g2pHints?: G2pHints;    // text-based IPA hints when phonemeSource === 'g2p'; never fake acoustic scores
};

// ── Transcription ─────────────────────────────────────────────────────────────

export type TranscriptionResult = {
  transcript: string;
  language: string;
  confidence: number;    // 0..1 normalised (Azure 0..100 ÷ 100, Whisper fixed 0.88)
  words: WordDetail[];   // empty array when Azure unavailable
  source: 'azure' | 'whisper' | 'fallback';
  jobId?: string;        // reserved for future async / BullMQ migration
};

// ── Pronunciation analysis ────────────────────────────────────────────────────
// SCORING BOUNDARY — never cross it:
//   Azure  → all numeric scores (pronunciationScore, accuracyScore, fluencyScore, completenessScore)
//   GPT    → feedback string + phonemeHints[] ONLY

export type PronunciationAnalysisResult = {
  transcript: string;
  pronunciationScore: number;      // 0..1  FROM AZURE ONLY
  accuracyScore: number;           // 0..1  FROM AZURE ONLY
  fluencyScore: number;            // 0..1  FROM AZURE ONLY
  completenessScore: number;       // 0..1  FROM AZURE ONLY
  prosodyScore: number | null;     // 0..1  FROM AZURE ONLY; null when region/tier doesn't support it
  feedback: string;                // FROM GPT ONLY
  phonemeHints: string[];          // FROM GPT ONLY (kept for FE compatibility)
  words: WordDetail[];             // FROM AZURE (empty on fallback)
  alignment: WordAlignment[];      // computed in SpeechService post-Azure
  phonemeSource: 'acoustic' | 'g2p' | 'none'; // acoustic = Azure SDK; g2p = espeak-ng text-based; none = no phoneme data
  source: 'azure+gpt' | 'azure-only' | 'fallback';
  jobId?: string;
};

// ── Text analysis ─────────────────────────────────────────────────────────────

export type AnalyzeResult = {
  correctedText: string;
  feedback: string;
  textScore: number; // 0..1
  jobId?: string;
};

// ── Task generation ───────────────────────────────────────────────────────────

export type GeneratedTask = {
  language: string;
  level: string;
  skill: string;
  prompt: string;
  audioUrl: string | null;
  referenceText: string | null;
  focusPhonemes: string[] | null; // IPA symbols this passage targets (speaking only)
  answerOptions: string[];        // always 4 elements; empty for speaking
  correctAnswer: string | null;   // "A" | "B" | "C" | "D"; null for speaking
};

// ── TTS ───────────────────────────────────────────────────────────────────────

export type TtsResult = {
  audioBase64: string | null;            // MP3 as base64; null when TTS unavailable
  mimeType: 'audio/mpeg' | null;
  durationEstimateMs: number | null;     // rough estimate from word count
};
