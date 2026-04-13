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

// ── Listening v2 — CEFR-graded 8-question format ─────────────────────────────

export type ListeningDifficulty = 'B1' | 'B2' | 'C1' | 'C2';

export interface ListeningMCQuestionV2 {
  type: 'multiple_choice';
  difficulty: ListeningDifficulty;
  points: number;
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;
}

export interface ListeningTFNGQuestionV2 {
  type: 'true_false_ng';
  difficulty: ListeningDifficulty;
  points: number;
  question: string;
  correctAnswer: 'T' | 'F' | 'NG';
}

export interface ListeningShortAnswerQuestionV2 {
  type: 'short_answer';
  difficulty: ListeningDifficulty;
  points: number;
  question: string;
  correctAnswer: string;
}

export interface ListeningParaphraseQuestionV2 {
  type: 'paraphrase';
  difficulty: ListeningDifficulty;
  points: number;
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;
}

export type ListeningQuestionV2 =
  | ListeningMCQuestionV2
  | ListeningTFNGQuestionV2
  | ListeningShortAnswerQuestionV2
  | ListeningParaphraseQuestionV2;

export interface ListeningPassageV2 {
  passageText: string;
  questions: ListeningQuestionV2[]; // exactly 8
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

  // ── Listening exercise v2 generation ──────────────────────────────────────

  async generateListeningExercise(language: string, level: string): Promise<ListeningPassageV2> {
    if (!this.orchestratorBaseUrl) {
      return this.localListeningExerciseFallback(level);
    }
    try {
      const response = await axios.post(
        `${this.orchestratorBaseUrl.replace(/\/$/, '')}/tasks/generate-listening`,
        { language, level, version: '2' },
        { timeout: 35_000 },
      );
      const d = response?.data;
      if (
        typeof d?.passageText === 'string' &&
        Array.isArray(d?.questions) &&
        d.questions.length === 8
      ) {
        return d as ListeningPassageV2;
      }
    } catch {
      console.warn('AI orchestrator listening exercise v2 generation failed, using fallback');
    }
    return this.localListeningExerciseFallback(level);
  }

  // ── Text-to-speech ─────────────────────────────────────────────────────────

  async synthesizeSpeech(text: string, language: string): Promise<TtsResult> {
    if (!this.orchestratorBaseUrl) {
      return { audioBase64: null, mimeType: null, durationEstimateMs: null };
    }
    // Long passages (listening ~400 words) need up to 90s for TTS generation
    const timeout = (text?.trim().length ?? 0) > 500 ? 100_000 : 35_000;
    try {
      const response = await axios.post(
        `${this.orchestratorBaseUrl.replace(/\/$/, '')}/audio/tts`,
        { text, language },
        { timeout },
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

  private localListeningExerciseFallback(level = 'C2'): ListeningPassageV2 {
    const passageText =
      'Over the past few years, remote work has become increasingly popular, especially among young professionals. ' +
      'Many people appreciate the flexibility it offers, allowing them to manage their time more effectively and avoid long commutes. ' +
      'However, this shift has also introduced new challenges. Some workers report feeling disconnected from their colleagues, ' +
      'which can affect teamwork and motivation. Interestingly, companies are now experimenting with hybrid models, ' +
      'where employees split their time between home and the office. This approach seems to combine the advantages of both systems. ' +
      'While it may not suit everyone, it reflects a broader change in how we think about work and productivity in the modern world. ' +
      'Studies suggest that workers who have flexible arrangements tend to report higher job satisfaction. ' +
      'Managers, on the other hand, often worry about maintaining a strong team culture when people are not physically together. ' +
      'Communication tools have improved greatly to support remote collaboration, but some employees still prefer face-to-face interaction. ' +
      'The future of work is likely to involve a mix of different arrangements tailored to individual roles and preferences.';

    const b1: ListeningQuestionV2[] = [
      { type: 'multiple_choice', difficulty: 'B1', points: 1, question: 'Why do people like remote work?', options: ['It pays more', 'It offers flexibility', 'It is easier to find', 'It requires less skill'], correctAnswer: 1 },
      { type: 'multiple_choice', difficulty: 'B1', points: 1, question: 'What is the hybrid model?', options: ['Working only from home', 'Working only in the office', 'Combining remote and office work', 'Changing jobs frequently'], correctAnswer: 2 },
      { type: 'multiple_choice', difficulty: 'B1', points: 1, question: 'Who especially likes remote work?', options: ['Senior managers', 'Young professionals', 'Factory workers', 'Part-time staff'], correctAnswer: 1 },
      { type: 'multiple_choice', difficulty: 'B1', points: 1, question: 'What have communication tools done to support remote work?', options: ['Become more expensive', 'Improved greatly', 'Become slower', 'Disappeared'], correctAnswer: 1 },
      { type: 'multiple_choice', difficulty: 'B1', points: 1, question: 'What do remote workers avoid?', options: ['Deadlines', 'Long commutes', 'Meetings', 'Office equipment'], correctAnswer: 1 },
      { type: 'multiple_choice', difficulty: 'B1', points: 1, question: 'What do workers with flexible arrangements report?', options: ['Lower salaries', 'Higher job satisfaction', 'More overtime', 'Less productivity'], correctAnswer: 1 },
      { type: 'multiple_choice', difficulty: 'B1', points: 1, question: 'What does the hybrid model combine?', options: ['Two different jobs', 'Remote and office work', 'Two languages', 'Part-time and full-time hours'], correctAnswer: 1 },
      { type: 'multiple_choice', difficulty: 'B1', points: 1, question: 'What is the future of work likely to involve?', options: ['Only office work', 'Only remote work', 'A mix of different arrangements', 'No flexible options'], correctAnswer: 2 },
    ];
    const b2: ListeningQuestionV2[] = [
      { type: 'true_false_ng', difficulty: 'B2', points: 2, question: 'Remote work became popular recently.', correctAnswer: 'T' },
      { type: 'true_false_ng', difficulty: 'B2', points: 2, question: 'Remote workers earn significantly more than office workers.', correctAnswer: 'NG' },
      { type: 'true_false_ng', difficulty: 'B2', points: 2, question: 'Some employees still prefer face-to-face interaction.', correctAnswer: 'T' },
      { type: 'true_false_ng', difficulty: 'B2', points: 2, question: 'The hybrid model suits everyone equally well.', correctAnswer: 'F' },
    ];
    const c1: ListeningQuestionV2[] = [
      { type: 'short_answer', difficulty: 'C1', points: 3, question: 'What do people avoid by working remotely?', correctAnswer: 'long commutes' },
      { type: 'short_answer', difficulty: 'C1', points: 3, question: 'What do managers worry about when people work remotely?', correctAnswer: 'team culture' },
      { type: 'short_answer', difficulty: 'C1', points: 3, question: 'What do flexible arrangements give workers according to studies?', correctAnswer: 'job satisfaction' },
      { type: 'short_answer', difficulty: 'C1', points: 3, question: 'What problem do some workers report when working remotely?', correctAnswer: 'feeling disconnected' },
    ];
    const c2: ListeningQuestionV2[] = [
      { type: 'paraphrase', difficulty: 'C2', points: 4, question: "What is the speaker's overall attitude toward hybrid work?", options: ['Completely negative', 'Completely positive', 'Balanced and neutral', 'Uncertain and confused'], correctAnswer: 2 },
      { type: 'paraphrase', difficulty: 'C2', points: 4, question: 'What can be inferred about the future of work?', options: ['Remote work will disappear completely', 'Work culture is continuing to evolve', 'All offices will close permanently', 'Employees are becoming less productive'], correctAnswer: 1 },
    ];

    let questions: ListeningQuestionV2[];
    switch (level) {
      case 'B1': questions = b1.slice(0, 8); break;
      case 'B2': questions = [...b1.slice(0, 4), ...b2.slice(0, 4)]; break;
      case 'C1': questions = [...b1.slice(0, 2), ...b2.slice(0, 2), ...c1.slice(0, 4)]; break;
      default:   questions = [...b1.slice(0, 2), ...b2.slice(0, 2), ...c1.slice(0, 2), ...c2];
    }

    return { passageText, questions };
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
