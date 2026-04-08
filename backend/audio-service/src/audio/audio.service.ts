import { Injectable } from '@nestjs/common';
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

export interface ListeningTaskResult {
  taskId: number;
  prompt: string;
  audioUrl: string | null;
  audioBase64: string | null;
  mimeType: string | null;
  answerOptions: string[];
  durationEstimateMs: number | null;
}

export interface ListeningScoreResult {
  score: number;
  correct: number;
  total: number;
}

@Injectable()
export class AudioService {
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

    // 1. Look for an existing task the user hasn't completed at 100% yet
    const existingTask = await this.audioRepository.getNextListeningTask(
      userIdInt,
      normalizedLanguage,
      level,
    );

    if (existingTask) {
      // Task already has audio stored as a data URL
      if (existingTask.audioUrl) {
        const isDataUrl = existingTask.audioUrl.startsWith('data:');
        return {
          taskId: existingTask.id,
          prompt: existingTask.prompt,
          audioUrl: isDataUrl ? existingTask.audioUrl : null,
          audioBase64: isDataUrl
            ? existingTask.audioUrl.split(',')[1] ?? null
            : null,
          mimeType: isDataUrl ? 'audio/mpeg' : null,
          answerOptions: existingTask.answerOptions,
          durationEstimateMs: null,
        };
      }

      // Task exists but has no audio — synthesize it and update
      const tts = await this.aiOrchestrator.synthesizeSpeech(
        existingTask.referenceText || existingTask.prompt,
        language,
      );

      if (tts.audioBase64) {
        const dataUrl = `data:audio/mpeg;base64,${tts.audioBase64}`;
        // Save audio back to the task for future requests
        await this.audioRepository.updateTaskAudio(existingTask.id, dataUrl);
        return {
          taskId: existingTask.id,
          prompt: existingTask.prompt,
          audioUrl: dataUrl,
          audioBase64: tts.audioBase64,
          mimeType: 'audio/mpeg',
          answerOptions: existingTask.answerOptions,
          durationEstimateMs: tts.durationEstimateMs,
        };
      }

      // TTS failed — return task without audio
      return {
        taskId: existingTask.id,
        prompt: existingTask.prompt,
        audioUrl: null,
        audioBase64: null,
        mimeType: null,
        answerOptions: existingTask.answerOptions,
        durationEstimateMs: null,
      };
    }

    // 2. No suitable task found — generate a new one via AI
    const generated = await this.aiOrchestrator.generateTask(language, level, 'listening');
    if (!generated) {
      throw new Error('Failed to generate listening task');
    }

    // 3. Synthesize audio for the new task
    const tts = await this.aiOrchestrator.synthesizeSpeech(
      generated.referenceText || generated.prompt,
      language,
    );

    const audioDataUrl = tts.audioBase64 ? `data:audio/mpeg;base64,${tts.audioBase64}` : null;

    // 4. Persist task with audio
    const savedTask = await this.audioRepository.createTask({
      language: normalizedLanguage,
      level,
      skill: 'listening',
      prompt: generated.prompt,
      audioUrl: audioDataUrl,
      referenceText: generated.referenceText,
      answerOptions: generated.answerOptions,
      correctAnswer: generated.correctAnswer,
    });

    return {
      taskId: savedTask.id,
      prompt: savedTask.prompt,
      audioUrl: audioDataUrl,
      audioBase64: tts.audioBase64,
      mimeType: tts.audioBase64 ? 'audio/mpeg' : null,
      answerOptions: savedTask.answerOptions,
      durationEstimateMs: tts.durationEstimateMs,
    };
  }

  async submitListeningScore(
    userId: string,
    taskId: number,
    userAnswers: string[],
  ): Promise<ListeningScoreResult> {
    const task = await this.audioRepository.getTaskById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Evaluate: each answer option label (A/B/C/D) is checked against correctAnswer
    const total = task.answerOptions.length;
    let correct = 0;

    if (task.correctAnswer) {
      // Single-answer task: first user answer is the chosen option index label
      const chosen = (userAnswers[0] || '').trim().toUpperCase();
      const expected = task.correctAnswer.trim().toUpperCase();
      if (chosen === expected) correct = total;
    } else {
      correct = 0;
    }

    const score = total > 0 ? correct / total : 0;

    await this.audioRepository.upsertListeningScore(parseInt(userId, 10), taskId, score);

    return { score, correct, total };
  }

  private async downloadAudio(audioUrl: string): Promise<Buffer> {
    const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }
}
