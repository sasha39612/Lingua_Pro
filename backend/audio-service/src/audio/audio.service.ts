import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AudioRepository, audioPeriodToFromDate, type AudioPeriod } from './audio.repository';
import { AiOrchestratorService, AudioAnalysisResult } from '../ai-orchestrator/ai-orchestrator.service';
import axios from 'axios';

interface AudioProcessingResult {
  id: number;
  userId: number;
  language: string;
  transcript: string;
  pronunciationScore: number;
  feedback: string;
  audioUrl: string;
  confidence: number;
  phonemeHints: string[];
  createdAt: Date;
}

export interface ListeningQuestionForClient {
  index: number;
  type?: string;
  difficulty?: string;
  points?: number;
  question: string;
  options?: string[];
}

export interface ListeningTaskResult {
  taskId: number;
  audioUrl: string | null;
  audioBase64: string | null;
  mimeType: string | null;
  questions: ListeningQuestionForClient[];
  durationEstimateMs: number | null;
}

export interface QuestionResult {
  questionIndex: number;
  question: string;
  type?: string;
  correct: boolean;
  userAnswer: number | string;
  correctAnswer: number | string;
  correctOptionText?: string;
  points: number;
  maxPoints: number;
}

export interface ListeningAnswersResult {
  score: number;
  rawScore: number;
  maxRawScore: number;
  correct: number;
  total: number;
  cefrLevel?: string;
  results: QuestionResult[];
}

const CEFR_LEVELS = ['B1', 'B2', 'C1', 'C2'] as const;




@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);

  constructor(
    private audioRepository: AudioRepository,
    private aiOrchestrator: AiOrchestratorService
  ) {}

  async processAudio(
    userId: string,
    language: string,
    audioUrl: string,
    expectedText?: string
  ): Promise<AudioProcessingResult> {
    language = language.toLowerCase();
    try {
      const audioBuffer = await this.downloadAudio(audioUrl);

      const { transcript, pronunciationScore, feedback, phonemeHints, confidence } =
        await this.aiOrchestrator.analyzeAudio(audioBuffer, 'audio/wav', language, expectedText);

      const audioRecord = await this.audioRepository.createAudioRecord({
        userId: parseInt(userId),
        language,
        transcript,
        pronunciationScore,
        audioUrl,
        feedback,
      });

      return {
        id: audioRecord.id,
        userId: audioRecord.userId,
        language: audioRecord.language,
        transcript: audioRecord.transcript ?? transcript,
        pronunciationScore: audioRecord.pronunciationScore ?? pronunciationScore,
        feedback: audioRecord.feedback ?? feedback,
        audioUrl: audioRecord.audioUrl ?? audioUrl,
        confidence,
        phonemeHints,
        createdAt: audioRecord.createdAt,
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      throw error;
    }
  }

  async getAudioRecords(userId: string) {
    return this.audioRepository.getAudioRecordsByUserId(parseInt(userId));
  }

  async getAudioRecord(id: string) {
    return this.audioRepository.getAudioRecord(parseInt(id));
  }

  async getUserStats(userId: string) {
    return this.audioRepository.getUserAudioStats(parseInt(userId));
  }

  async getListeningTasks(language: string, level?: string) {
    if (!process.env.DATABASE_URL) {
      return [];
    }
    return this.audioRepository.getListeningTasks(language, level);
  }

  async getRecordsByLanguage(language: string, from?: string, userId?: string) {
    return this.audioRepository.getRecordsByLanguage(language, from, userId);
  }

  async getListeningScoresByLanguage(language: string, from?: string, userId?: string) {
    const scores = await this.audioRepository.getListeningScoresByLanguage(language, from, userId);
    return { scores };
  }

  // ── Admin aggregation ────────────────────────────────────────────────────────

  async getAdminSummary(period: AudioPeriod, language?: string) {
    const fromDate = audioPeriodToFromDate(period);
    const lang = language ? language.toLowerCase() : undefined;

    const [
      byLanguage,
      topUsersSpeaking,
      topUsersListening,
      dailySpeaking,
      dailyListening,
      dailyActiveEst,
      activeUserCount,
    ] = await Promise.all([
      this.audioRepository.adminByLanguage(fromDate, lang),
      this.audioRepository.adminTopUsersSpeaking(fromDate, lang),
      this.audioRepository.adminTopUsersListening(fromDate, lang),
      this.audioRepository.adminDailySpeakingCounts(fromDate, lang),
      this.audioRepository.adminDailyListeningCounts(fromDate, lang),
      this.audioRepository.adminDailyActiveEstimate(fromDate, lang),
      this.audioRepository.adminActiveUserCount(fromDate),
    ]);

    const totalSpeaking = byLanguage.reduce((s, r) => s + r.speaking_count, 0);
    const totalListening = byLanguage.reduce((s, r) => s + r.listening_count, 0);

    return {
      period,
      language: lang ?? null,
      total_speaking_sessions: totalSpeaking,
      total_listening_sessions: totalListening,
      by_language: byLanguage,
      top_users_speaking: topUsersSpeaking,
      top_users_listening: topUsersListening,
      time_series: {
        daily_speaking: dailySpeaking,
        daily_listening: dailyListening,
        daily_active_user_estimate: dailyActiveEst,
      },
      funnel: {
        with_audio_activity: activeUserCount,
      },
    };
  }

  async adminActiveUserIds(fromDate: Date, language?: string) {
    return this.audioRepository.adminActiveUserIds(fromDate, language);
  }

  async evaluateComprehension(
    userAnswer: string,
    correctAnswer: string
  ): Promise<{ isCorrect: boolean; score: number; feedback: string }> {
    const normalizedUser = (userAnswer || '').trim().toLowerCase();
    const normalizedCorrect = (correctAnswer || '').trim().toLowerCase();

    if (!normalizedCorrect) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'Correct answer is missing for this task.'
      };
    }

    const isCorrect = normalizedUser === normalizedCorrect;
    const score = isCorrect ? 1 : 0;
    return {
      isCorrect,
      score,
      feedback: isCorrect
        ? 'Correct answer. Good listening comprehension.'
        : 'Incorrect answer. Replay the audio and try again.'
    };
  }

  async generateComprehension(taskId: string): Promise<{
    taskId: number;
    prompt: string;
    answerOptions: string[];
    correctAnswer: string | null;
  }> {
    if (!process.env.DATABASE_URL) {
      return {
        taskId: parseInt(taskId, 10),
        prompt: 'Database is unavailable. Cannot load listening task.',
        answerOptions: [],
        correctAnswer: null
      };
    }

    const task = await this.audioRepository.getTaskById(parseInt(taskId, 10));
    if (!task) {
      throw new Error('Listening task not found');
    }

    return {
      taskId: task.id,
      prompt: task.prompt,
      answerOptions: task.answerOptions,
      correctAnswer: task.correctAnswer
    };
  }

  async analyzeBase64(
    audioBuffer: Buffer,
    mimeType: string,
    language: string,
    userId: string,
    expectedText?: string,
  ): Promise<AudioAnalysisResult & { id?: number; createdAt?: Date }> {
    language = language.toLowerCase();
    const result = await this.aiOrchestrator.analyzeAudio(audioBuffer, mimeType, language, expectedText);

    try {
      const audioRecord = await this.audioRepository.createAudioRecord({
        userId: parseInt(userId),
        language,
        transcript: result.transcript,
        pronunciationScore: result.pronunciationScore,
        audioUrl: '',
        feedback: result.feedback,
      });
      return { ...result, id: audioRecord.id, createdAt: audioRecord.createdAt };
    } catch (err) {
      console.error('Failed to persist audio record, returning result without saving:', err);
      return result;
    }
  }

  // ── Listening task flow ─────────────────────────────────────────────────────

  async getListeningTask(
    userId: string,
    language: string,
    level: string,
  ): Promise<ListeningTaskResult> {
    const normalizedLanguage = language.toLowerCase();
    const userIdInt = parseInt(userId, 10);

    // 1. Look for an existing task with questionsJson that the user hasn't scored 100%
    const existingTask = await this.audioRepository.getNextListeningTask(
      userIdInt,
      normalizedLanguage,
      level,
    );

    if (existingTask && existingTask.questionsJson) {
      let rawQuestions: any[];
      try { rawQuestions = JSON.parse(existingTask.questionsJson); } catch { rawQuestions = []; }
      const isNewFormat = rawQuestions[0]?.difficulty !== undefined;

      // Only reuse new-format (v2) tasks — old 5-question tasks are superseded
      if (isNewFormat && rawQuestions.length === 8) {
        const questions = this.parseQuestionsForClient(existingTask.questionsJson);
        if (existingTask.audioUrl) {
          const isDataUrl = existingTask.audioUrl.startsWith('data:');
          const audioBase64 = isDataUrl ? (existingTask.audioUrl.split(',')[1] ?? null) : null;
          return {
            taskId: existingTask.id,
            audioUrl: isDataUrl ? existingTask.audioUrl : null,
            audioBase64,
            mimeType: isDataUrl ? 'audio/mpeg' : null,
            questions,
            durationEstimateMs: null,
          };
        }

        // Task exists but has no audio yet — synthesize and cache it
        const tts = await this.aiOrchestrator.synthesizeSpeech(
          existingTask.referenceText || existingTask.prompt,
          language,
        );
        if (tts.audioBase64) {
          const dataUrl = `data:audio/mpeg;base64,${tts.audioBase64}`;
          await this.audioRepository.updateTaskAudio(existingTask.id, dataUrl);
          return {
            taskId: existingTask.id,
            audioUrl: dataUrl,
            audioBase64: tts.audioBase64,
            mimeType: 'audio/mpeg',
            questions,
            durationEstimateMs: tts.durationEstimateMs,
          };
        }

        return {
          taskId: existingTask.id,
          audioUrl: null,
          audioBase64: null,
          mimeType: null,
          questions,
          durationEstimateMs: null,
        };
      }
    }

    // 2. No suitable task — generate a fresh 8-question exercise via AI
    this.logger.log(`getListeningTask: generating new exercise for userId=${userId} lang=${normalizedLanguage} level=${level}`);
    const passage = await this.aiOrchestrator.generateListeningExercise(language, level);

    // 3. Synthesize TTS audio for the passage text
    const tts = await this.aiOrchestrator.synthesizeSpeech(passage.passageText, language);
    const audioDataUrl = tts.audioBase64 ? `data:audio/mpeg;base64,${tts.audioBase64}` : null;

    // 4. Persist task — store passage text as referenceText, questions as questionsJson
    const savedTask = await this.audioRepository.createTask({
      language: normalizedLanguage,
      level,
      skill: 'listening',
      prompt: 'Listen to the audio and answer the comprehension questions.',
      audioUrl: audioDataUrl,
      referenceText: passage.passageText,
      answerOptions: [],
      correctAnswer: null,
      questionsJson: JSON.stringify(passage.questions),
    });

    const questions = this.parseQuestionsForClient(savedTask.questionsJson!);

    return {
      taskId: savedTask.id,
      audioUrl: audioDataUrl,
      audioBase64: tts.audioBase64,
      mimeType: tts.audioBase64 ? 'audio/mpeg' : null,
      questions,
      durationEstimateMs: tts.durationEstimateMs,
    };
  }

  /**
   * Two-phase SSE streaming for listening tasks.
   *
   * Phase 1: AI generates the passage + questions → emits task_ready.
   *          The task is persisted before phase 2 so cancellation mid-TTS
   *          doesn't orphan the record.
   * Phase 2: TTS synthesis → emits audio_ready.
   *          Cancellation is best-effort: if TTS is already in-flight when
   *          the client disconnects, the HTTP call runs to completion but the
   *          response write is suppressed.
   */
  async streamListeningTask(
    userId: string,
    language: string,
    level: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    const normalizedLanguage = language.toLowerCase();
    const userIdInt = parseInt(userId, 10);

    let cancelled = false;
    req.on('close', () => { cancelled = true; });

    const write = (event: object) => {
      if (!cancelled && !res.writableEnded) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    };

    try {
      // ── Phase 1: look for reusable task or generate fresh ────────────────
      let taskId: number;
      let questions: ListeningQuestionForClient[];
      let passageText: string;

      const existingTask = await this.audioRepository.getNextListeningTask(
        userIdInt,
        normalizedLanguage,
        level,
      );

      if (existingTask?.questionsJson) {
        let rawQuestions: any[];
        try { rawQuestions = JSON.parse(existingTask.questionsJson); } catch { rawQuestions = []; }
        const isNewFormat = rawQuestions[0]?.difficulty !== undefined && rawQuestions.length === 8;

        if (isNewFormat) {
          taskId = existingTask.id;
          questions = this.parseQuestionsForClient(existingTask.questionsJson!);
          passageText = existingTask.referenceText || existingTask.prompt;

          // If already has audio, emit both events and close
          if (existingTask.audioUrl) {
            const isDataUrl = existingTask.audioUrl.startsWith('data:');
            const audioBase64 = isDataUrl ? (existingTask.audioUrl.split(',')[1] ?? null) : null;
            write({ event: 'task_ready', data: { taskId, passage: passageText, questions } });
            write({ event: 'audio_ready', data: { taskId, audioBase64, mimeType: 'audio/mpeg' } });
            if (!res.writableEnded) res.end();
            return;
          }

          write({ event: 'task_ready', data: { taskId, passage: passageText, questions } });
          // Fall through to TTS phase
        } else {
          // Old format — generate fresh
          const { taskId: newId, questions: newQuestions, passageText: newPassage } =
            await this.generateAndPersistListeningTask(language, normalizedLanguage, level);
          taskId = newId;
          questions = newQuestions;
          passageText = newPassage;
          write({ event: 'task_ready', data: { taskId, passage: passageText, questions } });
        }
      } else {
        const { taskId: newId, questions: newQuestions, passageText: newPassage } =
          await this.generateAndPersistListeningTask(language, normalizedLanguage, level);
        taskId = newId;
        questions = newQuestions;
        passageText = newPassage;
        write({ event: 'task_ready', data: { taskId, passage: passageText, questions } });
      }

      // ── Phase 2: TTS synthesis (best-effort cancellation) ────────────────
      if (!cancelled) {
        try {
          const tts = await this.aiOrchestrator.synthesizeSpeech(passageText!, language);
          if (tts.audioBase64) {
            const dataUrl = `data:audio/mpeg;base64,${tts.audioBase64}`;
            await this.audioRepository.updateTaskAudio(taskId!, dataUrl);
            write({ event: 'audio_ready', data: { taskId, audioBase64: tts.audioBase64, mimeType: 'audio/mpeg' } });
          } else {
            write({ event: 'audio_unavailable', data: { taskId } });
          }
        } catch (ttsErr) {
          this.logger.warn(`streamListeningTask: TTS failed for taskId=${taskId}: ${ttsErr}`);
          write({ event: 'audio_unavailable', data: { taskId } });
        }
      }
    } catch (err) {
      this.logger.error(`streamListeningTask: phase 1 failed: ${err}`);
      write({ event: 'error', data: { message: 'Failed to generate listening task' } });
    } finally {
      if (!res.writableEnded) res.end();
    }
  }

  /** Shared helper: generate a fresh exercise from AI and persist it. */
  private async generateAndPersistListeningTask(
    language: string,
    normalizedLanguage: string,
    level: string,
  ): Promise<{ taskId: number; questions: ListeningQuestionForClient[]; passageText: string }> {
    this.logger.log(`streamListeningTask: generating new exercise lang=${normalizedLanguage} level=${level}`);
    const passage = await this.aiOrchestrator.generateListeningExercise(language, level);

    const savedTask = await this.audioRepository.createTask({
      language: normalizedLanguage,
      level,
      skill: 'listening',
      prompt: 'Listen to the audio and answer the comprehension questions.',
      audioUrl: null,
      referenceText: passage.passageText,
      answerOptions: [],
      correctAnswer: null,
      questionsJson: JSON.stringify(passage.questions),
    });

    return {
      taskId: savedTask.id,
      questions: this.parseQuestionsForClient(savedTask.questionsJson!),
      passageText: passage.passageText,
    };
  }

  async submitListeningAnswers(
    userId: string,
    taskId: number,
    userAnswers: Array<number | string>,
  ): Promise<ListeningAnswersResult> {
    this.logger.log(`submitListeningAnswers: userId=${userId} taskId=${taskId} answers=${JSON.stringify(userAnswers)}`);

    const task = await this.audioRepository.getTaskById(taskId);
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }
    if (!task.questionsJson) {
      this.logger.warn(`Task ${taskId} has no questionsJson — may be an old-format task`);
      throw new NotFoundException('Task has no questions. Press "Next Task" to load a new one.');
    }

    let questions: any[];
    try {
      questions = JSON.parse(task.questionsJson);
    } catch (err) {
      this.logger.error(`Failed to parse questionsJson for task ${taskId}: ${err}`);
      throw new InternalServerErrorException('Task question data is corrupted');
    }

    const isNewFormat = questions[0]?.difficulty !== undefined;
    const total = questions.length;
    let correct = 0;
    let rawScore = 0;

    const results: QuestionResult[] = questions.map((q: any, i: number) => {
      const userAnswer = userAnswers[i] ?? -1;
      const qType: string = q.type ?? 'multiple_choice';
      const maxPoints: number = isNewFormat ? (q.points ?? 1) : 1;
      let isCorrect = false;

      if (qType === 'true_false_ng') {
        isCorrect = typeof userAnswer === 'string' &&
          userAnswer.toUpperCase() === String(q.correctAnswer).toUpperCase();
      } else {
        // multiple_choice, paraphrase, short_answer — numeric index comparison
        isCorrect = typeof userAnswer === 'number' && userAnswer === q.correctAnswer;
      }

      if (isCorrect) {
        correct++;
        rawScore += maxPoints;
      }

      const baseResult = {
        questionIndex: i,
        question: q.question,
        type: qType,
        correct: isCorrect,
        userAnswer,
        correctAnswer: q.correctAnswer,
        points: isCorrect ? maxPoints : 0,
        maxPoints,
      };

      if (qType === 'multiple_choice' || qType === 'paraphrase' || qType === 'short_answer') {
        return { ...baseResult, correctOptionText: (q.options ?? [])[q.correctAnswer] ?? '' };
      }
      return baseResult;
    });

    let score: number;
    let cefrLevel: string | undefined;

    if (isNewFormat) {
      const maxRawScore = questions.reduce((sum: number, q: any) => sum + (q.points ?? 1), 0);
      score = maxRawScore > 0 ? rawScore / maxRawScore : 0;
      const taskLevel = task.level ?? 'B1';
      const userLevelIdx = Math.max(0, CEFR_LEVELS.indexOf(taskLevel as typeof CEFR_LEVELS[number]));
      const pct = score;
      const cefrIdx = pct >= 0.9
        ? userLevelIdx
        : pct >= 0.6
          ? Math.max(0, userLevelIdx - 1)
          : Math.max(0, userLevelIdx - 2);
      cefrLevel = CEFR_LEVELS[cefrIdx];
      try {
        await this.audioRepository.upsertListeningScore(parseInt(userId, 10), taskId, score);
      } catch (err: any) {
        this.logger.error(`Failed to persist listening score: ${err?.message ?? err}`);
      }
      return { score, rawScore, maxRawScore, correct, total, cefrLevel, results };
    }

    // Old format — flat scoring
    score = total > 0 ? correct / total : 0;
    try {
      await this.audioRepository.upsertListeningScore(parseInt(userId, 10), taskId, score);
    } catch (err: any) {
      this.logger.error(`Failed to persist listening score: ${err?.message ?? err}`);
    }
    return { score, rawScore: correct, maxRawScore: total, correct, total, results };
  }

  // Strip correctAnswer before sending to client so the answer isn't exposed
  private parseQuestionsForClient(questionsJson: string): ListeningQuestionForClient[] {
    try {
      const parsed: any[] = JSON.parse(questionsJson);
      return parsed.map((q, i) => {
        const base: ListeningQuestionForClient = {
          index: i,
          type: q.type ?? 'multiple_choice',
          difficulty: q.difficulty,
          points: q.points,
          question: q.question,
        };
        // Only send options for question types that need them
        if (q.type === 'multiple_choice' || q.type === 'paraphrase' || q.type === 'short_answer' || q.type === undefined) {
          base.options = q.options;
        }
        // correctAnswer intentionally omitted
        return base;
      });
    } catch {
      return [];
    }
  }

  private async downloadAudio(audioUrl: string): Promise<Buffer> {
    const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }
}
