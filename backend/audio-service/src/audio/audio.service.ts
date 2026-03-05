import { Injectable } from '@nestjs/common';
import { AudioRepository } from './audio.repository';
import { AiOrchestratorService } from '../ai-orchestrator/ai-orchestrator.service';
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
  suggestions: string[];
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
    try {
      // Download audio from URL
      const audioBuffer = await this.downloadAudio(audioUrl);

      // Process through AI Orchestrator → Whisper
      const { transcript, confidence } = await this.aiOrchestrator.processAudioWithWhisper(
        audioBuffer,
        language
      );

      // Analyze pronunciation
      const { score: pronunciationScore, feedback, suggestions } = 
        await this.aiOrchestrator.analyzePronunciation(transcript, language, expectedText);

      // Save to PostgreSQL using repository
      const audioRecord = await this.audioRepository.createAudioRecord({
        userId: parseInt(userId),
        language,
        transcript,
        pronunciationScore,
        audioUrl,
        feedback
      });

      // Return formatted response with transcript and pronunciation score
      return {
        id: audioRecord.id,
        userId: audioRecord.userId,
        language: audioRecord.language,
        transcript: audioRecord.transcript,
        pronunciationScore: audioRecord.pronunciationScore,
        feedback: audioRecord.feedback,
        audioUrl: audioRecord.audioUrl,
        confidence,
        suggestions,
        createdAt: audioRecord.createdAt
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

  private async downloadAudio(audioUrl: string): Promise<Buffer> {
    const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }
}