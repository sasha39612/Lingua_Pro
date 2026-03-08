import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { Observable, concat, from, of } from 'rxjs';
import { map } from 'rxjs/operators';

type AnalyzeResult = {
  correctedText: string;
  feedback: string;
  textScore: number;
};

export type TranscriptionResult = {
  transcript: string;
  language: string;
  confidence: number;
};

export type PronunciationResult = {
  transcript: string;
  pronunciationScore: number;
  feedback: string;
  phonemeHints: string[];
};

type GeneratedTask = {
  language: string;
  level: string;
  skill: string;
  prompt: string;
  audioUrl: string | null;
  referenceText: string | null;
  answerOptions: string[];
  correctAnswer: string | null;
};

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private readonly openai: OpenAI | null;
  private readonly textModel: string;
  private readonly taskModel: string;
  private readonly evalModel: string;
  private readonly transcriptionModel: string;

  constructor() {
    const apiKey = process.env.AI_API_KEY;
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
    this.textModel = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';
    this.taskModel = process.env.OPENAI_TASK_MODEL || 'gpt-4o-mini';
    this.evalModel = process.env.OPENAI_EVAL_MODEL || 'gpt-4o-mini';
    this.transcriptionModel = process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1';
  }

  async analyzeText(text: string, language: string): Promise<AnalyzeResult> {
    const normalized = (text || '').trim();
    if (!normalized) {
      return {
        correctedText: '',
        feedback: `Please provide text to analyze (${language}).`,
        textScore: 0.5,
      };
    }

    if (!this.openai) {
      return this.localTextAnalysis(normalized, language);
    }

    try {
      const response = await this.withRetry(async () => {
        return this.withTimeout(
          this.openai!.chat.completions.create({
            model: this.textModel,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  `You are a language tutor for ${this.languageTone(language)}. ` +
                  'Return strict JSON with keys: correctedText (string), feedback (string), textScore (number 0..1). ' +
                  'Focus on grammar, spelling, punctuation, and clarity. Keep feedback concise and actionable.',
              },
              {
                role: 'user',
                content: `Language: ${language}\nStudent text: ${normalized}`,
              },
            ],
            temperature: 0.2,
          }),
          15000,
          'text analyze request timed out',
        );
      }, 'analyzeText');

      const content = response.choices?.[0]?.message?.content || '{}';
      const parsed = this.safeJsonParse<{ correctedText?: string; feedback?: string; textScore?: number }>(content);
      const fallback = this.localTextAnalysis(normalized, language);

      return {
        correctedText: (parsed.correctedText || fallback.correctedText).trim(),
        feedback: (parsed.feedback || fallback.feedback).trim(),
        textScore: this.normalizeScore(parsed.textScore, fallback.textScore),
      };
    } catch (error: any) {
      this.logger.warn(`OpenAI text analysis failed, using fallback: ${error?.message || error}`);
      return this.localTextAnalysis(normalized, language);
    }
  }

  async generateTasks(language: string, level: string, skill?: string): Promise<GeneratedTask[]> {
    const safeLanguage = (language || 'English').trim() || 'English';
    const safeLevel = (level || 'A1').trim() || 'A1';
    const safeSkill = (skill || 'reading').trim() || 'reading';

    if (!this.openai) {
      return this.localTaskGeneration(safeLanguage, safeLevel, safeSkill);
    }

    try {
      const response = await this.withRetry(async () => {
        return this.withTimeout(
          this.openai!.chat.completions.create({
            model: this.taskModel,
            response_format: { type: 'json_object' },
            temperature: 0.4,
            messages: [
              {
                role: 'system',
                content:
                  `Generate 3 ${safeSkill} tasks for a ${safeLanguage} learner at CEFR ${safeLevel}. ` +
                  'Return strict JSON with key tasks containing array of objects. ' +
                  'Each task must include: prompt, answerOptions (4 short strings), correctAnswer (A/B/C/D), referenceText (nullable string), audioUrl (nullable string).',
              },
              {
                role: 'user',
                content: `language=${safeLanguage}, level=${safeLevel}, skill=${safeSkill}`,
              },
            ],
          }),
          18000,
          'task generation request timed out',
        );
      }, 'generateTasks');

      const content = response.choices?.[0]?.message?.content || '{}';
      const parsed = this.safeJsonParse<{ tasks?: Array<any> }>(content);
      const candidates = Array.isArray(parsed.tasks) ? parsed.tasks : [];

      if (candidates.length === 0) {
        return this.localTaskGeneration(safeLanguage, safeLevel, safeSkill);
      }

      return candidates.slice(0, 3).map((task, index) => this.normalizeTask(task, safeLanguage, safeLevel, safeSkill, index));
    } catch (error: any) {
      this.logger.warn(`OpenAI task generation failed, using fallback: ${error?.message || error}`);
      return this.localTaskGeneration(safeLanguage, safeLevel, safeSkill);
    }
  }

  async transcribeAudio(audioBase64: string, mimeType: string, language: string): Promise<TranscriptionResult> {
    const safeLanguage = (language || 'English').trim() || 'English';
    const buffer = this.decodeBase64(audioBase64);

    if (!this.openai || !buffer) {
      return {
        transcript: this.offlineTranscriptStub(safeLanguage),
        language: safeLanguage,
        confidence: 0.45,
      };
    }

    try {
      const transcript = await this.withRetry(async () => {
        return this.withTimeout(
          this.openAiTranscribe(buffer, mimeType),
          25000,
          'transcription request timed out',
        );
      }, 'transcribeAudio');

      return {
        transcript: transcript.trim() || this.offlineTranscriptStub(safeLanguage),
        language: safeLanguage,
        confidence: 0.88,
      };
    } catch (error: any) {
      this.logger.warn(`OpenAI transcription failed, using fallback: ${error?.message || error}`);
      return {
        transcript: this.offlineTranscriptStub(safeLanguage),
        language: safeLanguage,
        confidence: 0.45,
      };
    }
  }

  async evaluatePronunciation(
    referenceText: string,
    language: string,
    audioBase64?: string,
    transcript?: string,
    mimeType = 'audio/webm',
  ): Promise<PronunciationResult> {
    const safeLanguage = (language || 'English').trim() || 'English';
    const sourceTranscript = transcript && transcript.trim().length > 0
      ? transcript.trim()
      : (await this.transcribeAudio(audioBase64 || '', mimeType, safeLanguage)).transcript;

    if (!this.openai) {
      return this.localPronunciationEval(sourceTranscript, referenceText, safeLanguage);
    }

    try {
      const response = await this.withRetry(async () => {
        return this.withTimeout(
          this.openai!.chat.completions.create({
            model: this.evalModel,
            response_format: { type: 'json_object' },
            temperature: 0.2,
            messages: [
              {
                role: 'system',
                content:
                  'You are a pronunciation evaluator. Return strict JSON with keys: pronunciationScore (0..1), feedback (string), phonemeHints (array of strings). ' +
                  'Compare student transcript to reference text. Consider substitutions, omissions, and word stress hints.',
              },
              {
                role: 'user',
                content:
                  `Language: ${safeLanguage}\nReference: ${referenceText}\nStudent transcript: ${sourceTranscript}`,
              },
            ],
          }),
          15000,
          'pronunciation evaluation timed out',
        );
      }, 'evaluatePronunciation');

      const content = response.choices?.[0]?.message?.content || '{}';
      const parsed = this.safeJsonParse<{ pronunciationScore?: number; feedback?: string; phonemeHints?: string[] }>(content);
      const fallback = this.localPronunciationEval(sourceTranscript, referenceText, safeLanguage);

      return {
        transcript: sourceTranscript,
        pronunciationScore: this.normalizeScore(parsed.pronunciationScore, fallback.pronunciationScore),
        feedback: (parsed.feedback || fallback.feedback).trim(),
        phonemeHints: Array.isArray(parsed.phonemeHints) && parsed.phonemeHints.length > 0
          ? parsed.phonemeHints.slice(0, 4)
          : fallback.phonemeHints,
      };
    } catch (error: any) {
      this.logger.warn(`OpenAI pronunciation evaluation failed, using fallback: ${error?.message || error}`);
      return this.localPronunciationEval(sourceTranscript, referenceText, safeLanguage);
    }
  }

  streamTextAnalysis(text: string, language: string): Observable<{ data: any }> {
    const started = of({ data: { type: 'status', message: 'analysis_started' } });
    const result = from(this.analyzeText(text, language)).pipe(
      map((analysis) => ({ data: { type: 'result', ...analysis } })),
    );
    const done = of({ data: { type: 'status', message: 'analysis_complete' } });
    return concat(started, result, done);
  }

  private async openAiTranscribe(buffer: Buffer, mimeType: string): Promise<string> {
    const ext = this.mimeToExt(mimeType);
    const file = await toFile(buffer, `student-audio.${ext}`, { type: mimeType || 'audio/webm' });
    const response = await this.openai!.audio.transcriptions.create({
      model: this.transcriptionModel,
      file,
    });
    return response.text || '';
  }

  private localTextAnalysis(text: string, language: string): AnalyzeResult {
    const normalized = (text || '').trim();

    let corrected = normalized
      .replace(/\s+/g, ' ')
      .replace(/\bstuding\b/gi, 'studying');

    const hasTerminalPunctuation = /[.!?]$/.test(corrected);
    if (!hasTerminalPunctuation) {
      corrected += '.';
    }

    let feedback = 'Great work! No obvious errors detected.';
    if (corrected !== normalized) {
      feedback = 'Minor corrections were applied to improve spelling and punctuation.';
    }

    const textScore = corrected === normalized ? 0.95 : 0.82;

    return {
      correctedText: corrected,
      feedback: `[${language}] ${feedback}`,
      textScore,
    };
  }

  private localTaskGeneration(language: string, level: string, skill: string): GeneratedTask[] {
    const prompts = this.promptSet(language, level, skill);
    return prompts.map((prompt, index) => ({
      ...this.normalizeTask(
        {
          prompt,
          answerOptions: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: ['A', 'B', 'C', 'D'][index % 4],
          audioUrl: null,
          referenceText: null,
        },
        language,
        level,
        skill,
        index,
      ),
    }));
  }

  private normalizeTask(task: any, language: string, level: string, skill: string, index: number): GeneratedTask {
    const options = Array.isArray(task?.answerOptions) && task.answerOptions.length >= 4
      ? task.answerOptions.slice(0, 4).map((item: any) => String(item))
      : ['Option A', 'Option B', 'Option C', 'Option D'];

    const correct = typeof task?.correctAnswer === 'string' ? task.correctAnswer.toUpperCase().trim() : '';
    const normalizedCorrect = ['A', 'B', 'C', 'D'].includes(correct)
      ? correct
      : ['A', 'B', 'C', 'D'][index % 4];

    return {
      language,
      level,
      skill,
      prompt: String(task?.prompt || `${language} ${skill} task for level ${level}`),
      audioUrl: task?.audioUrl ? String(task.audioUrl) : null,
      referenceText: task?.referenceText ? String(task.referenceText) : null,
      answerOptions: options,
      correctAnswer: normalizedCorrect,
    };
  }

  private localPronunciationEval(transcript: string, referenceText: string, language: string): PronunciationResult {
    const similarity = this.tokenSimilarity(transcript, referenceText);
    const score = Math.max(0.4, Math.min(0.98, similarity));
    const hints = this.phonemeHints(language);

    return {
      transcript,
      pronunciationScore: Number(score.toFixed(2)),
      feedback:
        score > 0.85
          ? 'Strong pronunciation overall. Focus on natural rhythm and sentence stress.'
          : 'Pronunciation differs from reference in several words. Slow down and repeat key syllables.',
      phonemeHints: hints,
    };
  }

  private phonemeHints(language: string): string[] {
    const lang = language.toLowerCase();
    if (lang.includes('english')) return ['/th/ in "think"', '/w/ vs /v/', 'final consonant release'];
    if (lang.includes('german')) return ['ich-Laut /c/', 'ach-Laut /x/', 'umlaut clarity (ae/oe/ue)'];
    if (lang.includes('polish')) return ['sz / sh contrast', 'cz / ch contrast', 'nasal vowels timing'];
    if (lang.includes('albanian')) return ['ll vs l distinction', 'r vs rr trilling', 'clear final vowels'];
    return ['consonant clarity', 'vowel length', 'word stress'];
  }

  private tokenSimilarity(source: string, target: string): number {
    const src = this.toTokens(source);
    const tgt = this.toTokens(target);
    if (src.length === 0 || tgt.length === 0) return 0.4;

    const srcSet = new Set(src);
    const tgtSet = new Set(tgt);
    let overlap = 0;
    for (const token of srcSet) {
      if (tgtSet.has(token)) overlap += 1;
    }
    return overlap / Math.max(srcSet.size, tgtSet.size);
  }

  private toTokens(text: string): string[] {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  private offlineTranscriptStub(language: string): string {
    return `Transcription unavailable right now for ${language}; fallback transcript generated.`;
  }

  private languageTone(language: string): string {
    const lang = language.toLowerCase();
    if (lang.includes('german')) return 'German learners';
    if (lang.includes('albanian')) return 'Albanian learners';
    if (lang.includes('polish')) return 'Polish learners';
    return 'English learners';
  }

  private normalizeScore(value: number | undefined, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
    return Math.max(0, Math.min(1, Number(value.toFixed(2))));
  }

  private safeJsonParse<T>(input: string): T {
    try {
      return JSON.parse(input) as T;
    } catch {
      return {} as T;
    }
  }

  private decodeBase64(data: string): Buffer | null {
    if (!data || typeof data !== 'string') return null;
    const payload = data.includes(',') ? data.split(',')[1] : data;
    try {
      return Buffer.from(payload, 'base64');
    } catch {
      return null;
    }
  }

  private mimeToExt(mimeType: string): string {
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

  private async withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    const attempts = 3;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt === attempts) break;
        const waitMs = 400 * Math.pow(2, attempt - 1);
        this.logger.warn(`${label}: attempt ${attempt} failed, retrying in ${waitMs}ms`);
        await this.sleep(waitMs);
      }
    }

    throw lastError;
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private promptSet(language: string, level: string, skill: string): string[] {
    const base = `${language} ${skill} task for level ${level}`;

    return [
      `${base}: Complete the missing word in a short sentence.`,
      `${base}: Rewrite one sentence using past tense.`,
      `${base}: Pick the best answer from four options.`,
    ];
  }
}
