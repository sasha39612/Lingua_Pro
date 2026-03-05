import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AudioService } from './audio.service';

interface CheckAudioRequest {
  userId: string;
  language: string;
  audioUrl: string;
  expectedText?: string;
}

interface CheckAudioResponse {
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

@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post('check')
  async checkAudio(@Body() body: CheckAudioRequest): Promise<CheckAudioResponse> {
    const { userId, language, audioUrl, expectedText } = body;

    if (!userId || !language || !audioUrl) {
      throw new BadRequestException('userId, language, and audioUrl are required');
    }

    return this.audioService.processAudio(userId, language, audioUrl, expectedText);
  }

  @Get('records/:userId')
  async getAudioRecords(@Param('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.audioService.getAudioRecords(userId);
  }

  @Get('record/:id')
  async getAudioRecord(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('id is required');
    }
    return this.audioService.getAudioRecord(id);
  }

  @Get('stats/:userId')
  async getUserStats(@Param('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.audioService.getUserStats(userId);
  }
}