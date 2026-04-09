import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { AudioRepository } from './audio.repository';
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
  question: string;
  options: [string, string, string, string];
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
  correct: boolean;
  userAnswer: number;
  correctAnswer: number;
  correctOptionText: string;
}

export interface ListeningAnswersResult {
  score: number;
  correct: number;
  total: number;
  results: QuestionResult[];
}

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

  async getRecordsByLanguage(language: string, from?: string) {
    return this.audioRepository.getRecordsByLanguage(language, from);
  }

  async getListeningScoresByLanguage(language: string, from?: string) {
    const scores = await this.audioRepository.getListeningScoresByLanguage(language, from);
    return { scores };
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
    audioBase64: string,
    mimeType: string,
    language: string,
    userId: string,
    expectedText?: string,
  ): Promise<AudioAnalysisResult & { id?: number; createdAt?: Date }> {
    language = language.toLowerCase();
    const audioBuffer = Buffer.from(audioBase64, 'base64');
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
      const questions = this.parseQuestionsForClient(existingTask.questionsJson);
      if (questions.length === 5) {
        // Task already has audio stored as a data URL
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

    // 2. No suitable task — generate a fresh passage with 5 questions via AI
    this.logger.log(`getListeningTask: generating new passage for userId=${userId} lang=${normalizedLanguage} level=${level}`);
    const passage = await this.aiOrchestrator.generateListeningPassage(language, level);

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

  async submitListeningAnswers(
    userId: string,
    taskId: number,
    userAnswers: number[],
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

    let questions: { question: string; options: string[]; correctAnswer: number }[];
    try {
      questions = JSON.parse(task.questionsJson);
    } catch (err) {
      this.logger.error(`Failed to parse questionsJson for task ${taskId}: ${err}`);
      throw new InternalServerErrorException('Task question data is corrupted');
    }

    const total = questions.length;
    let correct = 0;

    const results: QuestionResult[] = questions.map((q, i) => {
      const userAnswer = typeof userAnswers[i] === 'number' ? userAnswers[i] : -1;
      const isCorrect = userAnswer === q.correctAnswer;
      if (isCorrect) correct++;
      return {
        questionIndex: i,
        question: q.question,
        correct: isCorrect,
        userAnswer,
        correctAnswer: q.correctAnswer,
        correctOptionText: q.options[q.correctAnswer] ?? '',
      };
    });

    const score = total > 0 ? correct / total : 0;

    try {
      await this.audioRepository.upsertListeningScore(parseInt(userId, 10), taskId, score);
    } catch (err: any) {
      // Non-fatal: log the DB error but still return the results to the user
      this.logger.error(`Failed to persist listening score: ${err?.message ?? err}`);
    }

    return { score, correct, total, results };
  }

  // Strip correctAnswer before sending to client so the answer isn't exposed
  private parseQuestionsForClient(questionsJson: string): ListeningQuestionForClient[] {
    try {
      const parsed: { question: string; options: [string, string, string, string]; correctAnswer: number }[] =
        JSON.parse(questionsJson);
      return parsed.map((q, i) => ({
        index: i,
        question: q.question,
        options: q.options,
      }));
    } catch {
      return [];
    }
  }

  private async downloadAudio(audioUrl: string): Promise<Buffer> {
    const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }
}
