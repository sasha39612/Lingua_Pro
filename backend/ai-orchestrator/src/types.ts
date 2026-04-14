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

export type ReadingQuestionType = 'multiple_choice' | 'true_false_ng' | 'matching' | 'vocabulary' | 'main_idea';

export type ReadingQuestion = {
  type: ReadingQuestionType;
  question?: string;           // question text (all types except matching use this)
  options?: string[];          // 4 options for MC / vocabulary / main_idea
  correctAnswer?: string;      // 'A'|'B'|'C'|'D' for MC/vocab/main_idea; 'T'|'F'|'NG' for true_false_ng
  matchingIdea?: string;       // matching: the idea label e.g. "Personal growth"
  matchingOptions?: string[];  // matching: list of labels to choose from
  correctMatchIndex?: number;  // matching: 0-based index into matchingOptions
};

export type GeneratedTask = {
  language: string;
  level: string;
  skill: string;
  prompt: string;
  audioUrl: string | null;
  referenceText: string | null;
  focusPhonemes: string[] | null; // IPA symbols this passage targets (speaking only)
  answerOptions: string[];        // always 4 elements; empty for speaking / reading
  correctAnswer: string | null;   // "A" | "B" | "C" | "D"; null for speaking / reading
  questions?: ReadingQuestion[] | null; // populated for skill='reading'
};

// ── Listening passage (v1 — 5 MC questions, backward-compat) ─────────────────

export type ListeningQuestion = {
  question: string;
  options: [string, string, string, string]; // always exactly 4
  correctAnswer: number; // 0-based index into options
};

export type ListeningPassage = {
  passageText: string;         // ~400 word spoken text for TTS
  questions: ListeningQuestion[]; // always 5
};

// ── Listening passage (v2 — 8 questions, CEFR-graded) ────────────────────────

export type ListeningDifficulty = 'B1' | 'B2' | 'C1' | 'C2';

export interface ListeningMCQuestion {
  type: 'multiple_choice';
  difficulty: ListeningDifficulty;
  points: number;
  question: string;
  options: [string, string, string, string];
  correctAnswer: number; // 0-based index
}

export interface ListeningTFNGQuestion {
  type: 'true_false_ng';
  difficulty: ListeningDifficulty;
  points: number;
  question: string;
  correctAnswer: 'T' | 'F' | 'NG';
}

export interface ListeningShortAnswerQuestion {
  type: 'short_answer';
  difficulty: ListeningDifficulty;
  points: number;
  question: string;
  options: [string, string, string, string];
  correctAnswer: number; // 0-based index into options
}

export interface ListeningParaphraseQuestion {
  type: 'paraphrase';
  difficulty: ListeningDifficulty;
  points: number;
  question: string;
  options: [string, string, string, string];
  correctAnswer: number; // 0-based index
}

export type ListeningQuestionV2 =
  | ListeningMCQuestion
  | ListeningTFNGQuestion
  | ListeningShortAnswerQuestion
  | ListeningParaphraseQuestion;

export type ListeningPassageV2 = {
  passageText: string;
  questions: ListeningQuestionV2[]; // exactly 8
};

export const CEFR_LISTENING_MAP = [
  { min: 0,  max: 6,  level: 'B1' as const },
  { min: 7,  max: 12, level: 'B2' as const },
  { min: 13, max: 17, level: 'C1' as const },
  { min: 18, max: 20, level: 'C2' as const },
];

// ── Writing task ──────────────────────────────────────────────────────────────

export type WritingTask = {
  situation: string;
  taskDescription: string;
  taskPoints: string[];
  wordCountMin: number;
  wordCountMax: number;
  style: string;
  instructions: string[];
  exampleStructure: string[];
};

// ── Writing analysis ──────────────────────────────────────────────────────────

export type WritingCriterion = {
  score: number;   // 0..1
  feedback: string;
};

export type WritingAnalysisResult = {
  taskAchievement: WritingCriterion;
  grammarVocabulary: WritingCriterion;
  coherenceStructure: WritingCriterion;
  style: WritingCriterion;
  correctedText: string;
  overallScore: number;   // 0..1
  overallFeedback: string;
};

// ── TTS ───────────────────────────────────────────────────────────────────────

export type TtsResult = {
  audioBase64: string | null;            // MP3 as base64; null when TTS unavailable
  mimeType: 'audio/mpeg' | null;
  durationEstimateMs: number | null;     // rough estimate from word count
};
