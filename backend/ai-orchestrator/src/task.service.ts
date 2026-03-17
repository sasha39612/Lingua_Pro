import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { GeneratedTask } from './types';
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
                    ? `Generate 3 speaking tasks for a ${safeLanguage} learner at CEFR ${safeLevel}. ` +
                      'Each task is a short passage the student reads aloud. ' +
                      'Return strict JSON with key tasks containing an array of objects. ' +
                      'Each task must include: prompt (a one-sentence instruction like "Read the following passage aloud"), referenceText (a 2-4 sentence passage appropriate for the CEFR level), answerOptions (empty array []), correctAnswer (null), audioUrl (null).'
                    : `Generate 3 ${safeSkill} tasks for a ${safeLanguage} learner at CEFR ${safeLevel}. ` +
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

      return candidates
        .slice(0, 3)
        .map((task, index) => this.normalizeTask(task, safeLanguage, safeLevel, safeSkill, index));
    } catch (error: any) {
      this.logger.warn(`GPT task generation failed, using fallback: ${error?.message ?? error}`);
      return this.localTaskGeneration(safeLanguage, safeLevel, safeSkill);
    }
  }

  // ── Local fallback ─────────────────────────────────────────────────────────

  private localTaskGeneration(language: string, level: string, skill: string): GeneratedTask[] {
    if (skill === 'speaking') {
      return this.speakingPassageSet(language, level).map((referenceText: string, index: number) =>
        this.normalizeTask(
          {
            prompt: 'Read the following passage aloud.',
            answerOptions: [],
            correctAnswer: null,
            audioUrl: null,
            referenceText,
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

  private speakingPassageSet(language: string, level: string): string[] {
    const base = `${language}, CEFR ${level}`;
    return [
      `My name is Anna. I live in a small house. I have a cat and a dog. Every morning I drink coffee and read the news. (${base})`,
      `The weather today is sunny and warm. I like to walk in the park after work. There are many trees and flowers there. It makes me feel happy. (${base})`,
      `I went to the market yesterday. I bought some apples, bread, and milk. The market was very busy. I also met my neighbour there. (${base})`,
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
