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
      // Download audio from URL
      const audioBuffer = await this.downloadAudio(audioUrl);

      // Single call to orchestrator: transcription + Azure scoring + GPT feedback
      const { transcript, pronunciationScore, feedback, phonemeHints, confidence } =
        await this.aiOrchestrator.analyzeAudio(audioBuffer, 'audio/wav', language, expectedText);

      // Save to PostgreSQL using repository
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
  ): Promise<AudioAnalysisResult & { id: number; createdAt: Date }> {
    language = language.toLowerCase();
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const result = await this.aiOrchestrator.analyzeAudio(audioBuffer, mimeType, language, expectedText);

    const audioRecord = await this.audioRepository.createAudioRecord({
      userId: parseInt(userId),
      language,
      transcript: result.transcript,
      pronunciationScore: result.pronunciationScore,
      audioUrl: '',
      feedback: result.feedback,
    });

    return { ...result, id: audioRecord.id, createdAt: audioRecord.createdAt };
  }

  private async downloadAudio(audioUrl: string): Promise<Buffer> {
    const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }
}