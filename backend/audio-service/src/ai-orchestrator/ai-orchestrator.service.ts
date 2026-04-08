import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface WordDetail {
  word: string;
  accuracyScore: number;
  errorType: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation';
  phonemes: { phoneme: string; accuracyScore: number }[];
}

export interface WordAlignment {
  expected: string;
  spoken: string | null;
  type: 'correct' | 'missing' | 'extra' | 'mispronounced';
  wordDetail?: WordDetail;
}

export interface AudioAnalysisResult {
  transcript: string;
  pronunciationScore: number;  // 0..1 — FROM AZURE via orchestrator
  feedback: string;            // FROM GPT via orchestrator
  phonemeHints: string[];      // FROM GPT via orchestrator
  confidence: number;          // 0..1
  words: WordDetail[];
  alignment: WordAlignment[];
}

export interface GeneratedTask {
  language: string;
  level: string;
  skill: string;
  prompt: string;
  audioUrl: string | null;
  referenceText: string | null;
  focusPhonemes: string[] | null;
  answerOptions: string[];
  correctAnswer: string | null;
}

export interface ListeningQuestion {
  question: string;
  options: [string, string, string, string];
  correctAnswer: number; // 0-based index
}

export interface ListeningPassage {
  passageText: string;
  questions: ListeningQuestion[];
}

export interface TtsResult {
  audioBase64: string | null;
  mimeType: 'audio/mpeg' | null;
  durationEstimateMs: number | null;
}

@Injectable()
export class AiOrchestratorService {
  private readonly orchestratorBaseUrl = process.env.AI_ORCHESTRATOR_URL;

  // ── Audio pronunciation analysis ───────────────────────────────────────────

  async analyzeAudio(
    audioBuffer: Buffer,
    mimeType: string,
    language: string,
    referenceText?: string,
  ): Promise<AudioAnalysisResult> {
    if (this.orchestratorBaseUrl) {
      try {
        const response = await axios.post(
          `${this.orchestratorBaseUrl.replace(/\/$/, '')}/audio/pronunciation/analyze`,
          {
            audioBase64: audioBuffer.toString('base64'),
            mimeType,
            referenceText: referenceText || '',
            language,
          },
          { timeout: 60_000 },
        );

        const d = response?.data;
        if (d?.pronunciationScore !== undefined) {
          return {
            transcript: String(d.transcript || ''),
            pronunciationScore: Number(d.pronunciationScore),
            feedback: String(d.feedback || ''),
            phonemeHints: Array.isArray(d.phonemeHints)
              ? d.phonemeHints.map((h: unknown) => String(h))
              : [],
            confidence: Number(d.accuracyScore ?? d.pronunciationScore ?? 0),
            words: Array.isArray(d.words) ? d.words : [],
            alignment: Array.isArray(d.alignment) ? d.alignment : [],
          };
        }
      } catch (error) {
        console.warn('AI orchestrator pronunciation analyze call failed, using fallback');
      }
    }

    return this.localFallback(language);
  }

  // ── Task generation ────────────────────────────────────────────────────────

  async generateTask(language: string, level: string, skill = 'listening'): Promise<GeneratedTask | null> {
    if (!this.orchestratorBaseUrl) {
      return this.localTaskFallback(language, level, skill);
    }
    try {
      const response = await axios.post(
        `${this.orchestratorBaseUrl.replace(/\/$/, '')}/tasks/generate`,
        { language, level, skill },
        { timeout: 30_000 },
      );
      const tasks: GeneratedTask[] = response?.data?.tasks;
      if (Array.isArray(tasks) && tasks.length > 0) {
        return tasks[0];
      }
    } catch (error) {
      console.warn('AI orchestrator task generation failed, using fallback');
    }
    return this.localTaskFallback(language, level, skill);
  }

  // ── Listening passage generation ───────────────────────────────────────────

  async generateListeningPassage(language: string, level: string): Promise<ListeningPassage> {
    if (!this.orchestratorBaseUrl) {
      return this.localListeningPassageFallback(language, level);
    }
    try {
      const response = await axios.post(
        `${this.orchestratorBaseUrl.replace(/\/$/, '')}/tasks/generate-listening`,
        { language, level },
        { timeout: 30_000 },
      );
      const d = response?.data;
      if (
        typeof d?.passageText === 'string' &&
        Array.isArray(d?.questions) &&
        d.questions.length === 5
      ) {
        return d as ListeningPassage;
      }
    } catch {
      console.warn('AI orchestrator listening passage generation failed, using fallback');
    }
    return this.localListeningPassageFallback(language, level);
  }

  // ── Text-to-speech ─────────────────────────────────────────────────────────

  async synthesizeSpeech(text: string, language: string): Promise<TtsResult> {
    if (!this.orchestratorBaseUrl) {
      return { audioBase64: null, mimeType: null, durationEstimateMs: null };
    }
    try {
      const response = await axios.post(
        `${this.orchestratorBaseUrl.replace(/\/$/, '')}/audio/tts`,
        { text, language },
        { timeout: 30_000 },
      );
      const d = response?.data;
      if (d?.audioBase64) {
        return {
          audioBase64: String(d.audioBase64),
          mimeType: 'audio/mpeg',
          durationEstimateMs: d.durationEstimateMs ? Number(d.durationEstimateMs) : null,
        };
      }
    } catch (error) {
      console.warn('AI orchestrator TTS call failed');
    }
    return { audioBase64: null, mimeType: null, durationEstimateMs: null };
  }

  // ── Local fallbacks ────────────────────────────────────────────────────────

  private localFallback(language: string): AudioAnalysisResult {
    const score = 0.75;
    return {
      transcript: '',
      pronunciationScore: score,
      feedback: 'Pronunciation analysis unavailable. Please try again later.',
      phonemeHints: this.phonemeHints(language),
      confidence: score,
      words: [],
      alignment: [],
    };
  }

  private localListeningPassageFallback(language: string, level: string): ListeningPassage {
    return {
      passageText:
        `Welcome to this ${level} level ${language} listening exercise. ` +
        'Today we are going to talk about the importance of daily habits. Many successful people around the world share one thing in common: they follow a consistent daily routine. ' +
        'In the morning, they wake up early and spend time planning their day. They often exercise for at least thirty minutes to keep their body and mind healthy. ' +
        'Breakfast is considered the most important meal of the day. A good breakfast gives you energy and helps you concentrate better at work or school. ' +
        'During the day, successful people focus on their most important tasks first. They avoid distractions like social media and try to work in blocks of time. ' +
        'Taking short breaks is also very important. Research shows that our brains work better when we rest for five to ten minutes every hour. ' +
        'In the evening, people who sleep well tend to be more productive. Experts recommend sleeping for seven to eight hours each night. ' +
        'Before going to bed, many people read a book or listen to calm music instead of looking at screens. This helps the brain relax and prepare for sleep. ' +
        'Building good habits takes time and effort, but the results are worth it. Small changes in your daily routine can lead to big improvements in your health, happiness, and success.',
      questions: [
        {
          question: 'What do many successful people have in common?',
          options: ['They sleep very little', 'They follow a consistent daily routine', 'They never use social media', 'They work without breaks'],
          correctAnswer: 1,
        },
        {
          question: 'How long do the people in the passage typically exercise each morning?',
          options: ['Ten minutes', 'One hour', 'At least thirty minutes', 'Two hours'],
          correctAnswer: 2,
        },
        {
          question: 'Why is breakfast considered important according to the passage?',
          options: ['It saves money', 'It gives energy and helps concentration', 'It is the largest meal', 'It improves sleep'],
          correctAnswer: 1,
        },
        {
          question: 'How often does research suggest the brain needs a short rest?',
          options: ['Every thirty minutes', 'Every two hours', 'Every hour', 'Every three hours'],
          correctAnswer: 2,
        },
        {
          question: 'What do experts recommend instead of looking at screens before bed?',
          options: ['Exercising heavily', 'Eating a large meal', 'Reading a book or listening to calm music', 'Planning the next day in detail'],
          correctAnswer: 2,
        },
      ],
    };
  }

  private localTaskFallback(language: string, level: string, skill: string): GeneratedTask {
    return {
      language,
      level,
      skill,
      prompt: `Listen carefully and answer the question about the ${language} audio passage.`,
      audioUrl: null,
      referenceText: `This is a sample ${level} level ${language} listening exercise.`,
      focusPhonemes: null,
      answerOptions: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'A',
    };
  }

  private phonemeHints(language: string): string[] {
    const lang = language.toLowerCase();
    if (lang.includes('english')) return ['/th/ in "think"', '/w/ vs /v/', 'final consonant release'];
    if (lang.includes('german')) return ['ich-Laut /ç/', 'ach-Laut /x/', 'umlaut clarity'];
    if (lang.includes('polish')) return ['sz/sh contrast', 'cz/ch contrast', 'nasal vowels'];
    if (lang.includes('albanian')) return ['ll vs l distinction', 'r vs rr trilling'];
    return ['consonant clarity', 'vowel length', 'word stress'];
  }
}
