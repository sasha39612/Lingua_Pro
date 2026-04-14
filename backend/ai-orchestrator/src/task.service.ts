import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { GeneratedTask, ListeningPassage, ListeningPassageV2, ListeningQuestionV2, ReadingQuestion, WritingTask } from './types';
import { safeJsonParse, withRetry, withTimeout } from './util';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);
  private readonly openai: OpenAI | null;
  private readonly taskModel: string;

  constructor() {
    const apiKey = process.env.AI_API_KEY;
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
    this.taskModel = process.env.OPENAI_TASK_MODEL || 'gpt-4o-mini';
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async generateTasks(language: string, level: string, skill?: string): Promise<GeneratedTask[]> {
    const safeLanguage = (language || 'English').trim() || 'English';
    const safeLevel = (level || 'A1').trim() || 'A1';
    const safeSkill = (skill || 'reading').trim() || 'reading';

    if (safeSkill === 'reading') {
      const exercise = await this.generateReadingExercise(safeLanguage, safeLevel);
      return [exercise];
    }

    if (safeSkill === 'writing') {
      const task = await this.generateWritingTask(safeLanguage, safeLevel);
      const promptJson = JSON.stringify(task);
      return [{
        language: safeLanguage,
        level: safeLevel,
        skill: 'writing',
        prompt: promptJson,
        audioUrl: null,
        referenceText: null,
        focusPhonemes: null,
        answerOptions: [],
        correctAnswer: null,
      }];
    }

    if (!this.openai) {
      return this.localTaskGeneration(safeLanguage, safeLevel, safeSkill);
    }

    const isSpeaking = safeSkill === 'speaking';

    try {
      const response = await withRetry(
        () =>
          withTimeout(
            this.openai!.chat.completions.create({
              model: this.taskModel,
              response_format: { type: 'json_object' },
              temperature: 0.4,
              messages: [
                {
                  role: 'system',
                  content: isSpeaking
                    ? `Generate 3 speaking practice passages for a ${safeLanguage} learner at CEFR ${safeLevel}. ` +
                      `IMPORTANT: ALL text content (prompt, referenceText) MUST be written in ${safeLanguage}, not in English. ` +
                      'Each passage is meant to be read aloud by the student for pronunciation practice. ' +
                      'DO NOT generate multiple-choice questions, options, or any quiz content. ' +
                      'Return strict JSON with key "tasks" containing an array of 3 objects. ' +
                      'Each object MUST include: ' +
                      `"prompt" (one sentence in ${safeLanguage} like "Read the following passage aloud" translated to ${safeLanguage}), ` +
                      `"referenceText" (a 2-4 sentence natural passage in ${safeLanguage} appropriate for the CEFR level — this field is REQUIRED and must be non-empty), ` +
                      '"focusPhonemes" (array of 2-4 IPA symbols that appear frequently in the passage, e.g. ["θ", "r", "æ"]), ' +
                      '"answerOptions" (always empty array []), ' +
                      '"correctAnswer" (always null), ' +
                      '"audioUrl" (always null). ' +
                      `The passage must be natural, level-appropriate, written entirely in ${safeLanguage}, and contain the target phonemes.`
                    : `Generate 3 ${safeSkill} tasks for a ${safeLanguage} learner at CEFR ${safeLevel}. ` +
                      `IMPORTANT: ALL text content (prompts, answer options, reference text) MUST be written in ${safeLanguage}, not in English. ` +
                      'Return strict JSON with key tasks containing an array of objects. ' +
                      'Each task must include: prompt, answerOptions (4 short strings), correctAnswer (A/B/C/D), referenceText (nullable string), audioUrl (nullable string).',
                },
                {
                  role: 'user',
                  content: `language=${safeLanguage}, level=${safeLevel}, skill=${safeSkill}`,
                },
              ],
            }),
            18_000,
            'task generation request timed out',
          ),
        'generateTasks',
        this.logger,
      );

      const content = response.choices?.[0]?.message?.content || '{}';
      const parsed = safeJsonParse<{ tasks?: any[] }>(content);
      const candidates = Array.isArray(parsed.tasks) ? parsed.tasks : [];

      if (candidates.length === 0) {
        return this.localTaskGeneration(safeLanguage, safeLevel, safeSkill);
      }

      const valid = isSpeaking
        ? candidates.filter((t) => typeof t?.referenceText === 'string' && t.referenceText.trim().length > 0)
        : candidates;

      if (valid.length === 0) {
        this.logger.warn('GPT returned speaking tasks without referenceText, using fallback');
        return this.localTaskGeneration(safeLanguage, safeLevel, safeSkill);
      }

      return valid
        .slice(0, 3)
        .map((task, index) => this.normalizeTask(task, safeLanguage, safeLevel, safeSkill, index));
    } catch (error: any) {
      this.logger.warn(`GPT task generation failed, using fallback: ${error?.message ?? error}`);
      return this.localTaskGeneration(safeLanguage, safeLevel, safeSkill);
    }
  }

  // ── Listening passage generation ───────────────────────────────────────────

  async generateListeningPassage(language: string, level: string): Promise<ListeningPassage> {
    const safeLanguage = (language || 'English').trim() || 'English';
    const safeLevel = (level || 'A1').trim() || 'A1';

    if (!this.openai) {
      return this.localListeningPassage(safeLanguage, safeLevel);
    }

    try {
      const response = await withRetry(
        () =>
          withTimeout(
            this.openai!.chat.completions.create({
              model: this.taskModel,
              response_format: { type: 'json_object' },
              temperature: 0.7,
              messages: [
                {
                  role: 'system',
                  content:
                    `You are a language-learning content creator. Generate a listening comprehension exercise for a ${safeLanguage} learner at CEFR level ${safeLevel}.\n` +
                    `IMPORTANT: ALL text content (passageText, questions, options) MUST be written in ${safeLanguage}, not in English.\n` +
                    'Return strict JSON with exactly two keys:\n' +
                    `1. "passageText": a natural spoken monologue or narrative in ${safeLanguage}, approximately 350-420 words. ` +
                    'It must be written as continuous speech (no headers, no bullet points) and be appropriate for the CEFR level. ' +
                    'Choose an interesting real-world topic (science, culture, history, travel, food, technology, etc.).\n' +
                    `2. "questions": an array of EXACTLY 5 multiple-choice comprehension questions in ${safeLanguage} about the passage. ` +
                    'Each question must have: "question" (string), "options" (array of exactly 4 strings), "correctAnswer" (0-based integer index 0-3 pointing to the correct option). ' +
                    'Questions should test different aspects: main idea, specific details, vocabulary in context, inference, and speaker intent.',
                },
                {
                  role: 'user',
                  content: `language=${safeLanguage}, level=${safeLevel}`,
                },
              ],
            }),
            25_000,
            'listening passage generation timed out',
          ),
        'generateListeningPassage',
        this.logger,
      );

      const content = response.choices?.[0]?.message?.content || '{}';
      const parsed = safeJsonParse<{ passageText?: string; questions?: any[] }>(content);

      if (
        typeof parsed.passageText === 'string' &&
        parsed.passageText.trim().length > 100 &&
        Array.isArray(parsed.questions) &&
        parsed.questions.length === 5
      ) {
        const questions = parsed.questions.map((q: any, i: number) => ({
          question: String(q?.question || `Question ${i + 1}`),
          options: (Array.isArray(q?.options) && q.options.length === 4
            ? q.options.map((o: any) => String(o))
            : ['Option A', 'Option B', 'Option C', 'Option D']) as [string, string, string, string],
          correctAnswer:
            typeof q?.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer <= 3
              ? q.correctAnswer
              : i % 4,
        }));
        return { passageText: parsed.passageText.trim(), questions };
      }

      this.logger.warn('GPT returned invalid listening passage structure, using fallback');
    } catch (error: any) {
      this.logger.warn(`GPT listening passage generation failed, using fallback: ${error?.message ?? error}`);
    }

    return this.localListeningPassage(safeLanguage, safeLevel);
  }

  // ── Listening exercise v2 generation (8 questions, CEFR-graded) ───────────

  async generateListeningExercise(language: string, level: string): Promise<ListeningPassageV2> {
    const safeLanguage = (language || 'English').trim() || 'English';
    const safeLevel = (level || 'B1').trim() || 'B1';

    if (!this.openai) {
      return this.localListeningExercise(safeLanguage, safeLevel);
    }

    try {
      const response = await withRetry(
        () =>
          withTimeout(
            this.openai!.chat.completions.create({
              model: this.taskModel,
              response_format: { type: 'json_object' },
              temperature: 0.6,
              messages: [
                {
                  role: 'system',
                  content: (() => {
                    const passageDifficultyNote: Record<string, string> = {
                      B1: 'The passage must contain clear factual information answerable at B1 difficulty.',
                      B2: 'The passage must contain information answerable at B1 and B2 difficulty.',
                      C1: 'The passage must contain information answerable at B1 through C1 difficulty.',
                      C2: 'The passage must contain information answerable at B1 through C2 difficulty.',
                    };
                    const questionSpec: Record<string, string> = {
                      B1:
                        '2. "questions": an array of EXACTLY 8 question objects, all difficulty "B1" (straightforward factual recall):\n' +
                        '   - 8 questions: { "type": "multiple_choice", "difficulty": "B1", "points": 1, "question": string, "options": [4 strings], "correctAnswer": integer 0-3 }\n',
                      B2:
                        '2. "questions": an array of EXACTLY 8 question objects in this order:\n' +
                        '   - 4 questions with difficulty "B1" (straightforward factual recall):\n' +
                        '     { "type": "multiple_choice", "difficulty": "B1", "points": 1, "question": string, "options": [4 strings], "correctAnswer": integer 0-3 }\n' +
                        '   - 4 questions with difficulty "B2" (inference and detail — single True/False/Not Given statement):\n' +
                        '     { "type": "true_false_ng", "difficulty": "B2", "points": 2, "question": string, "correctAnswer": "T" | "F" | "NG" }\n' +
                        '     For "NG": the statement must be neither confirmed nor denied by the passage text.\n',
                      C1:
                        '2. "questions": an array of EXACTLY 8 question objects in this order:\n' +
                        '   - 2 questions with difficulty "B1" (straightforward factual recall):\n' +
                        '     { "type": "multiple_choice", "difficulty": "B1", "points": 1, "question": string, "options": [4 strings], "correctAnswer": integer 0-3 }\n' +
                        '   - 2 questions with difficulty "B2" (inference and detail — True/False/Not Given):\n' +
                        '     { "type": "true_false_ng", "difficulty": "B2", "points": 2, "question": string, "correctAnswer": "T" | "F" | "NG" }\n' +
                        '     For "NG": the statement must be neither confirmed nor denied by the passage text.\n' +
                        '   - 4 questions with difficulty "C1" (vocabulary in context or nuance — short written answer):\n' +
                        '     { "type": "short_answer", "difficulty": "C1", "points": 3, "question": string, "correctAnswer": string (1-5 words, the canonical answer) }\n',
                      C2:
                        '2. "questions": an array of EXACTLY 8 question objects in this order:\n' +
                        '   - 2 questions with difficulty "B1" (straightforward factual recall):\n' +
                        '     { "type": "multiple_choice", "difficulty": "B1", "points": 1, "question": string, "options": [4 strings], "correctAnswer": integer 0-3 }\n' +
                        '   - 2 questions with difficulty "B2" (inference and detail — True/False/Not Given):\n' +
                        '     { "type": "true_false_ng", "difficulty": "B2", "points": 2, "question": string, "correctAnswer": "T" | "F" | "NG" }\n' +
                        '     For "NG": the statement must be neither confirmed nor denied by the passage text.\n' +
                        '   - 2 questions with difficulty "C1" (vocabulary in context or nuance — short written answer):\n' +
                        '     { "type": "short_answer", "difficulty": "C1", "points": 3, "question": string, "correctAnswer": string (1-5 words, the canonical answer) }\n' +
                        '   - 2 questions with difficulty "C2" (paraphrase / speaker intent):\n' +
                        '     { "type": "paraphrase", "difficulty": "C2", "points": 4, "question": string, "options": [4 strings], "correctAnswer": integer 0-3 }\n',
                    };
                    const spec = questionSpec[safeLevel] ?? questionSpec['B1'];
                    const passageNote = passageDifficultyNote[safeLevel] ?? passageDifficultyNote['B1'];
                    return (
                      `You are a language-learning content creator. Generate a CEFR-graded listening comprehension exercise for a ${safeLanguage} learner at level ${safeLevel}.\n` +
                      `IMPORTANT: ALL text (passageText, questions, options) MUST be written in ${safeLanguage}.\n` +
                      'Return strict JSON with exactly two keys:\n' +
                      `1. "passageText": a natural spoken monologue, approximately 450 words, written as continuous speech (no headers, no bullet points). Choose an engaging real-world topic. ${passageNote}\n` +
                      spec +
                      'Rules: B1 tests basic facts; B2 tests whether a statement is True, False, or Not Given; C1 requires a short open answer about vocabulary or nuance; C2 requires choosing the best paraphrase of the speaker\'s meaning. Do not repeat information across questions.'
                    );
                  })(),
                },
                {
                  role: 'user',
                  content: `language=${safeLanguage}, level=${safeLevel}`,
                },
              ],
            }),
            28_000,
            'listening exercise v2 generation timed out',
          ),
        'generateListeningExercise',
        this.logger,
      );

      const content = response.choices?.[0]?.message?.content || '{}';
      const parsed = safeJsonParse<{ passageText?: string; questions?: any[] }>(content);

      if (
        typeof parsed.passageText === 'string' &&
        parsed.passageText.trim().length > 100 &&
        Array.isArray(parsed.questions) &&
        parsed.questions.length === 8
      ) {
        // Clamp questions to the allowed difficulty ceiling for this level
        const allowedDifficulties: Record<string, string[]> = {
          B1: ['B1'],
          B2: ['B1', 'B2'],
          C1: ['B1', 'B2', 'C1'],
          C2: ['B1', 'B2', 'C1', 'C2'],
        };
        const allowed = allowedDifficulties[safeLevel] ?? allowedDifficulties['B1'];
        const maxAllowedDifficulty = allowed[allowed.length - 1];
        const questions: ListeningQuestionV2[] = parsed.questions.map((q: any, i: number) => {
          const type = String(q?.type || 'multiple_choice');
          const rawDifficulty = ['B1', 'B2', 'C1', 'C2'].includes(q?.difficulty) ? q.difficulty : 'B1';
          const difficulty = allowed.includes(rawDifficulty) ? rawDifficulty : maxAllowedDifficulty;
          const points = typeof q?.points === 'number' ? q.points : { B1: 1, B2: 2, C1: 3, C2: 4 }[difficulty as string] ?? 1;

          if (type === 'true_false_ng') {
            return {
              type: 'true_false_ng' as const,
              difficulty,
              points,
              question: String(q?.question || `Question ${i + 1}`),
              correctAnswer: ['T', 'F', 'NG'].includes(String(q?.correctAnswer))
                ? (String(q.correctAnswer) as 'T' | 'F' | 'NG')
                : 'T',
            };
          }
          if (type === 'short_answer') {
            return {
              type: 'short_answer' as const,
              difficulty,
              points,
              question: String(q?.question || `Question ${i + 1}`),
              correctAnswer: String(q?.correctAnswer || ''),
            };
          }
          if (type === 'paraphrase') {
            const opts = Array.isArray(q?.options) && q.options.length === 4
              ? q.options.map((o: any) => String(o))
              : ['Option A', 'Option B', 'Option C', 'Option D'];
            return {
              type: 'paraphrase' as const,
              difficulty,
              points,
              question: String(q?.question || `Question ${i + 1}`),
              options: opts as [string, string, string, string],
              correctAnswer: typeof q?.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer <= 3
                ? q.correctAnswer : 0,
            };
          }
          // default: multiple_choice
          const opts = Array.isArray(q?.options) && q.options.length === 4
            ? q.options.map((o: any) => String(o))
            : ['Option A', 'Option B', 'Option C', 'Option D'];
          return {
            type: 'multiple_choice' as const,
            difficulty,
            points,
            question: String(q?.question || `Question ${i + 1}`),
            options: opts as [string, string, string, string],
            correctAnswer: typeof q?.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer <= 3
              ? q.correctAnswer : 0,
          };
        });

        return { passageText: parsed.passageText.trim(), questions };
      }

      this.logger.warn('GPT returned invalid listening exercise v2 structure, using fallback');
    } catch (error: any) {
      this.logger.warn(`GPT listening exercise v2 generation failed, using fallback: ${error?.message ?? error}`);
    }

    return this.localListeningExercise(safeLanguage, safeLevel);
  }

  // ── Reading exercise generation ────────────────────────────────────────────

  async generateReadingExercise(language: string, level: string): Promise<GeneratedTask> {
    if (!this.openai) {
      return this.localReadingExercise(language, level);
    }

    try {
      const response = await withRetry(
        () =>
          withTimeout(
            this.openai!.chat.completions.create({
              model: this.taskModel,
              response_format: { type: 'json_object' },
              temperature: 0.5,
              messages: [
                {
                  role: 'system',
                  content:
                    `You are a language-learning content creator. Generate a reading comprehension exercise for a ${language} learner at CEFR level ${level}.\n` +
                    `IMPORTANT: ALL text (passage, questions, options, labels) MUST be written in ${language}.\n` +
                    'Return strict JSON with exactly two keys:\n' +
                    `1. "passageText": a natural narrative passage, 600–700 characters long, no headers or bullet points, written in ${language}.\n` +
                    '2. "questions": an array of exactly 16 question objects in this order:\n' +
                    `   - 5 objects with type "multiple_choice": { "type": "multiple_choice", "question": string, "options": [4 strings], "correctAnswer": "A"|"B"|"C"|"D" }\n` +
                    `   - 3 objects with type "true_false_ng": { "type": "true_false_ng", "question": string, "correctAnswer": "T"|"F"|"NG" }\n` +
                    `   - 3 objects with type "matching": { "type": "matching", "matchingIdea": string (short concept label), "matchingOptions": [3 short paragraph-meaning strings], "correctMatchIndex": 0-based integer }\n` +
                    `   - 3 objects with type "vocabulary": { "type": "vocabulary", "question": string (asks meaning of a word from the passage), "options": [4 strings], "correctAnswer": "A"|"B"|"C"|"D" }\n` +
                    `   - 2 objects with type "main_idea": { "type": "main_idea", "question": string, "options": [4 strings], "correctAnswer": "A"|"B"|"C"|"D" }`,
                },
                {
                  role: 'user',
                  content: `language=${language}, level=${level}`,
                },
              ],
            }),
            25_000,
            'reading exercise generation timed out',
          ),
        'generateReadingExercise',
        this.logger,
      );

      const content = response.choices?.[0]?.message?.content || '{}';
      const parsed = safeJsonParse<{ passageText?: string; questions?: any[] }>(content);

      if (
        typeof parsed.passageText === 'string' &&
        parsed.passageText.trim().length > 100 &&
        Array.isArray(parsed.questions) &&
        parsed.questions.length === 16
      ) {
        const questions: ReadingQuestion[] = parsed.questions.map((q: any) => {
          if (q.type === 'matching') {
            return {
              type: 'matching' as const,
              matchingIdea: String(q.matchingIdea || ''),
              matchingOptions: Array.isArray(q.matchingOptions)
                ? q.matchingOptions.map((o: any) => String(o))
                : ['Option 1', 'Option 2', 'Option 3'],
              correctMatchIndex:
                typeof q.correctMatchIndex === 'number' ? q.correctMatchIndex : 0,
            };
          }
          return {
            type: q.type as ReadingQuestion['type'],
            question: String(q.question || ''),
            options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : undefined,
            correctAnswer: typeof q.correctAnswer === 'string' ? q.correctAnswer : undefined,
          };
        });

        return {
          language,
          level,
          skill: 'reading',
          prompt: `Reading comprehension exercise · ${language} · ${level}`,
          audioUrl: null,
          referenceText: parsed.passageText.trim(),
          focusPhonemes: null,
          answerOptions: [],
          correctAnswer: null,
          questions,
        };
      }

      this.logger.warn('GPT returned invalid reading exercise structure, using fallback');
    } catch (error: any) {
      this.logger.warn(`GPT reading exercise generation failed, using fallback: ${error?.message ?? error}`);
    }

    return this.localReadingExercise(language, level);
  }

  // ── Writing task generation ────────────────────────────────────────────────

  async generateWritingTask(language: string, level: string): Promise<WritingTask> {
    if (!this.openai) {
      return this.localWritingTask(language, level);
    }

    try {
      const response = await withRetry(
        () =>
          withTimeout(
            this.openai!.chat.completions.create({
              model: this.taskModel,
              response_format: { type: 'json_object' },
              temperature: 0.7,
              messages: [
                {
                  role: 'system',
                  content:
                    `You are a language-learning content creator. Generate a writing task for a ${language} learner at CEFR level ${level}.\n` +
                    `IMPORTANT: ALL text content MUST be written in ${language}, not in English.\n` +
                    'Return strict JSON with exactly these keys:\n' +
                    '"situation": a 1-2 sentence real-life scenario that motivates the writing task.\n' +
                    '"taskDescription": one sentence describing the writing format (e.g. email, essay, letter) and approximate word count.\n' +
                    '"taskPoints": array of 3-4 short strings, each describing one bullet point the student must address.\n' +
                    '"wordCountMin": integer (minimum words, e.g. 120).\n' +
                    '"wordCountMax": integer (maximum words, e.g. 180).\n' +
                    '"style": one word — the register, e.g. "informal" or "formal".\n' +
                    '"instructions": array of 4-5 short instruction strings (word count rule, style, coverage of points, paragraph structure, greeting/ending).\n' +
                    '"exampleStructure": array of 4-5 short strings describing the expected paragraph structure (e.g. "Greeting", "Opening sentence", "Main paragraphs", "Closing").',
                },
                {
                  role: 'user',
                  content: `language=${language}, level=${level}, skill=writing`,
                },
              ],
            }),
            20_000,
            'writing task generation timed out',
          ),
        'generateWritingTask',
        this.logger,
      );

      const content = response.choices?.[0]?.message?.content || '{}';
      const parsed = safeJsonParse<Partial<WritingTask>>(content);

      if (
        typeof parsed.situation === 'string' &&
        typeof parsed.taskDescription === 'string' &&
        Array.isArray(parsed.taskPoints) &&
        parsed.taskPoints.length >= 2
      ) {
        return {
          situation: parsed.situation.trim(),
          taskDescription: parsed.taskDescription.trim(),
          taskPoints: parsed.taskPoints.map((p: any) => String(p)),
          wordCountMin: typeof parsed.wordCountMin === 'number' ? parsed.wordCountMin : 120,
          wordCountMax: typeof parsed.wordCountMax === 'number' ? parsed.wordCountMax : 180,
          style: typeof parsed.style === 'string' ? parsed.style : 'informal',
          instructions: Array.isArray(parsed.instructions) ? parsed.instructions.map((i: any) => String(i)) : [],
          exampleStructure: Array.isArray(parsed.exampleStructure) ? parsed.exampleStructure.map((s: any) => String(s)) : [],
        };
      }

      this.logger.warn('GPT returned invalid writing task structure, using fallback');
    } catch (error: any) {
      this.logger.warn(`GPT writing task generation failed, using fallback: ${error?.message ?? error}`);
    }

    return this.localWritingTask(language, level);
  }

  private localWritingTask(language: string, _level: string): WritingTask {
    return {
      situation: `You have recently moved to a new city and started a new job. Your ${language}-speaking friend wants to know how things are going.`,
      taskDescription: `Write an email to your friend (120–180 words) covering all the points below.`,
      taskPoints: [
        'describe your new job',
        'explain what you like or dislike about the city',
        'say how your daily life has changed',
        'invite your friend to visit you',
      ],
      wordCountMin: 120,
      wordCountMax: 180,
      style: 'informal',
      instructions: [
        'Write 120–180 words',
        'Use an informal style',
        'Answer all bullet points',
        'Organize your text into paragraphs',
        'Use appropriate greetings and ending',
      ],
      exampleStructure: [
        'Greeting (Hi / Dear…)',
        'Opening (why you are writing)',
        'Main paragraphs (answer all points)',
        'Closing + invitation',
        'Ending (Best wishes / Take care…)',
      ],
    };
  }

  private localReadingExercise(language: string, level: string): GeneratedTask {
    const passage =
      'Anna recently moved to a small town to work remotely as a graphic designer. ' +
      'At first, she felt isolated because she did not know anyone and missed the energy of the city. ' +
      'However, over time, she started exploring the area, joining local events, and meeting new people. ' +
      'She discovered that the quieter lifestyle helped her focus better on her work. ' +
      'Although she sometimes still misses her old life, she now appreciates the balance between work and relaxation that the town offers.';

    const questions: ReadingQuestion[] = [
      // Multiple choice (5)
      {
        type: 'multiple_choice',
        question: 'What was Anna\'s job?',
        options: ['Teacher', 'Graphic designer', 'Doctor', 'Engineer'],
        correctAnswer: 'B',
      },
      {
        type: 'multiple_choice',
        question: 'What was Anna\'s first reaction to moving?',
        options: ['She was excited', 'She felt lonely', 'She immediately liked the town', 'She found many friends'],
        correctAnswer: 'B',
      },
      {
        type: 'multiple_choice',
        question: 'What helped Anna focus better on her work?',
        options: ['City energy', 'New friends', 'Quieter lifestyle', 'Remote office'],
        correctAnswer: 'C',
      },
      {
        type: 'multiple_choice',
        question: 'How did Anna meet new people?',
        options: ['Through work meetings', 'By joining local events', 'Via social media', 'Through old friends'],
        correctAnswer: 'B',
      },
      {
        type: 'multiple_choice',
        question: 'What does Anna appreciate now?',
        options: ['City nightlife', 'Balance between work and relaxation', 'Remote meetings only', 'Her old apartment'],
        correctAnswer: 'B',
      },
      // True / False / Not Given (3)
      {
        type: 'true_false_ng',
        question: 'Anna moved because she found a new office job.',
        correctAnswer: 'F',
      },
      {
        type: 'true_false_ng',
        question: 'She met new people over time.',
        correctAnswer: 'T',
      },
      {
        type: 'true_false_ng',
        question: 'She never misses her old life.',
        correctAnswer: 'F',
      },
      // Matching (3)
      {
        type: 'matching',
        matchingIdea: 'Initial difficulty',
        matchingOptions: ['Personal growth', 'Initial difficulty', 'Better productivity'],
        correctMatchIndex: 1,
      },
      {
        type: 'matching',
        matchingIdea: 'Better productivity',
        matchingOptions: ['Personal growth', 'Initial difficulty', 'Better productivity'],
        correctMatchIndex: 2,
      },
      {
        type: 'matching',
        matchingIdea: 'Personal growth',
        matchingOptions: ['Personal growth', 'Initial difficulty', 'Better productivity'],
        correctMatchIndex: 0,
      },
      // Vocabulary (3)
      {
        type: 'vocabulary',
        question: 'What does "isolated" mean in the text?',
        options: ['Busy', 'Lonely', 'Relaxed', 'Inspired'],
        correctAnswer: 'B',
      },
      {
        type: 'vocabulary',
        question: 'What does "appreciates" mean in the text?',
        options: ['Ignores', 'Values', 'Dislikes', 'Forgets'],
        correctAnswer: 'B',
      },
      {
        type: 'vocabulary',
        question: 'What does "remotely" mean in the text?',
        options: ['In an office', 'From a distance / from home', 'Very slowly', 'With others'],
        correctAnswer: 'B',
      },
      // Main idea (2)
      {
        type: 'main_idea',
        question: 'What is the main message of the text?',
        options: ['City life is always better', 'Remote work is difficult', 'Change can be hard but positive', 'Small towns are boring'],
        correctAnswer: 'C',
      },
      {
        type: 'main_idea',
        question: 'Which title best fits the text?',
        options: ['Back to the City', 'A New Beginning in a Small Town', 'The Problems of Remote Work', 'How to Make Friends'],
        correctAnswer: 'B',
      },
    ];

    return {
      language,
      level,
      skill: 'reading',
      prompt: `Reading comprehension exercise · ${language} · ${level}`,
      audioUrl: null,
      referenceText: passage,
      focusPhonemes: null,
      answerOptions: [],
      correctAnswer: null,
      questions,
    };
  }

  // ── Local fallback ─────────────────────────────────────────────────────────

  private localTaskGeneration(language: string, level: string, skill: string): GeneratedTask[] {
    if (skill === 'speaking') {
      return this.speakingPassageSet(language, level).map(({ text, phonemes }, index: number) =>
        this.normalizeTask(
          {
            prompt: 'Read the following passage aloud.',
            answerOptions: [],
            correctAnswer: null,
            audioUrl: null,
            referenceText: text,
            focusPhonemes: phonemes,
          },
          language,
          level,
          skill,
          index,
        ),
      );
    }
    return this.promptSet(language, level, skill).map((prompt, index) =>
      this.normalizeTask(
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
    );
  }

  private normalizeTask(
    task: any,
    language: string,
    level: string,
    skill: string,
    index: number,
  ): GeneratedTask {
    const isSpeaking = skill === 'speaking';

    const options = isSpeaking
      ? []
      : Array.isArray(task?.answerOptions) && task.answerOptions.length >= 4
        ? task.answerOptions.slice(0, 4).map((item: any) => String(item))
        : ['Option A', 'Option B', 'Option C', 'Option D'];

    let normalizedCorrect: string | null = null;
    if (!isSpeaking) {
      const correct = typeof task?.correctAnswer === 'string'
        ? task.correctAnswer.toUpperCase().trim()
        : '';
      normalizedCorrect = ['A', 'B', 'C', 'D'].includes(correct)
        ? correct
        : ['A', 'B', 'C', 'D'][index % 4];
    }

    const focusPhonemes = isSpeaking && Array.isArray(task?.focusPhonemes)
      ? task.focusPhonemes.filter((p: any) => typeof p === 'string' && p.trim().length > 0).slice(0, 6)
      : null;

    return {
      language,
      level,
      skill,
      prompt: String(task?.prompt || `${language} ${skill} task for level ${level}`),
      audioUrl: task?.audioUrl ? String(task.audioUrl) : null,
      referenceText: task?.referenceText ? String(task.referenceText) : null,
      focusPhonemes,
      answerOptions: options,
      correctAnswer: normalizedCorrect,
    };
  }

  private localListeningExercise(_language: string, level: string): ListeningPassageV2 {
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

    // B1 questions (multiple_choice, 1pt)
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

    // B2 questions (true_false_ng, 2pts)
    const b2: ListeningQuestionV2[] = [
      { type: 'true_false_ng', difficulty: 'B2', points: 2, question: 'Remote work became popular recently.', correctAnswer: 'T' },
      { type: 'true_false_ng', difficulty: 'B2', points: 2, question: 'Remote workers earn significantly more than office workers.', correctAnswer: 'NG' },
      { type: 'true_false_ng', difficulty: 'B2', points: 2, question: 'Some employees still prefer face-to-face interaction.', correctAnswer: 'T' },
      { type: 'true_false_ng', difficulty: 'B2', points: 2, question: 'The hybrid model suits everyone equally well.', correctAnswer: 'F' },
    ];

    // C1 questions (short_answer, 3pts)
    const c1: ListeningQuestionV2[] = [
      { type: 'short_answer', difficulty: 'C1', points: 3, question: 'What do people avoid by working remotely?', correctAnswer: 'long commutes' },
      { type: 'short_answer', difficulty: 'C1', points: 3, question: 'What do managers worry about when people work remotely?', correctAnswer: 'team culture' },
      { type: 'short_answer', difficulty: 'C1', points: 3, question: 'What do flexible arrangements give workers according to studies?', correctAnswer: 'job satisfaction' },
      { type: 'short_answer', difficulty: 'C1', points: 3, question: 'What problem do some workers report when working remotely?', correctAnswer: 'feeling disconnected' },
    ];

    // C2 questions (paraphrase, 4pts)
    const c2: ListeningQuestionV2[] = [
      { type: 'paraphrase', difficulty: 'C2', points: 4, question: "What is the speaker's overall attitude toward hybrid work?", options: ['Completely negative', 'Completely positive', 'Balanced and neutral', 'Uncertain and confused'], correctAnswer: 2 },
      { type: 'paraphrase', difficulty: 'C2', points: 4, question: 'What can be inferred from the passage about the future of work?', options: ['Remote work will disappear completely', 'Work culture is continuing to evolve', 'All offices will close permanently', 'Employees are becoming less productive'], correctAnswer: 1 },
    ];

    let questions: ListeningQuestionV2[];
    switch (level) {
      case 'B1':
        questions = b1.slice(0, 8); // 8×B1
        break;
      case 'B2':
        questions = [...b1.slice(0, 4), ...b2.slice(0, 4)]; // 4×B1 + 4×B2
        break;
      case 'C1':
        questions = [...b1.slice(0, 2), ...b2.slice(0, 2), ...c1.slice(0, 4)]; // 2+2+4
        break;
      default: // C2
        questions = [...b1.slice(0, 2), ...b2.slice(0, 2), ...c1.slice(0, 2), ...c2]; // 2+2+2+2
    }

    return { passageText, questions };
  }

  private localListeningPassage(language: string, level: string): ListeningPassage {
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
        'Building good habits takes time and effort, but the results are worth it. Small changes in your daily routine can lead to big improvements in your health, happiness, and success over time.',
      questions: [
        {
          question: 'What do many successful people have in common according to the passage?',
          options: ['They sleep very little', 'They follow a consistent daily routine', 'They never use social media', 'They work without breaks'],
          correctAnswer: 1,
        },
        {
          question: 'How long do the people mentioned in the passage typically exercise each morning?',
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
          question: 'What do experts recommend doing before going to bed instead of looking at screens?',
          options: ['Exercising heavily', 'Eating a large meal', 'Reading a book or listening to calm music', 'Planning the next day in detail'],
          correctAnswer: 2,
        },
      ],
    };
  }

  private speakingPassageSet(language: string, level: string): { text: string; phonemes: string[] }[] {
    const base = `${language}, CEFR ${level}`;
    return [
      {
        text: `My name is Anna. I live in a small house. I have a cat and a dog. Every morning I drink coffee and read the news. (${base})`,
        phonemes: ['æ', 'n', 'ɪ'],
      },
      {
        text: `The weather today is sunny and warm. I like to walk in the park after work. There are many trees and flowers there. It makes me feel happy. (${base})`,
        phonemes: ['ð', 'w', 'ɑː'],
      },
      {
        text: `I went to the market yesterday. I bought some apples, bread, and milk. The market was very busy. I also met my neighbour there. (${base})`,
        phonemes: ['m', 'ɑː', 'b'],
      },
    ];
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
