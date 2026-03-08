import { Body, Controller, MessageEvent, Post, Query, Sse } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { Observable } from 'rxjs';
import { OrchestratorService } from './orchestrator.service';

class AnalyzeTextDto {
  @IsString()
  text!: string;

  @IsString()
  language!: string;
}

class GenerateTasksDto {
  @IsString()
  language!: string;

  @IsString()
  level!: string;

  @IsOptional()
  @IsString()
  skill?: string;
}

class TranscribeAudioDto {
  @IsString()
  audioBase64!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  language?: string;
}

class PronunciationEvaluateDto {
  @IsString()
  referenceText!: string;

  @IsString()
  language!: string;

  @IsOptional()
  @IsString()
  transcript?: string;

  @IsOptional()
  @IsString()
  audioBase64?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

@Controller()
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('text/analyze')
  async analyzeText(@Body() body: AnalyzeTextDto) {
    return this.orchestratorService.analyzeText(body.text, body.language);
  }

  @Post('tasks/generate')
  async generateTasks(@Body() body: GenerateTasksDto) {
    return {
      tasks: await this.orchestratorService.generateTasks(
        body.language,
        body.level,
        body.skill,
      ),
    };
  }

  @Post('audio/transcribe')
  async transcribeAudio(@Body() body: TranscribeAudioDto) {
    return this.orchestratorService.transcribeAudio(
      body.audioBase64,
      body.mimeType || 'audio/webm',
      body.language || 'English',
    );
  }

  @Post('audio/pronunciation/evaluate')
  async evaluatePronunciation(@Body() body: PronunciationEvaluateDto) {
    return this.orchestratorService.evaluatePronunciation(
      body.referenceText,
      body.language,
      body.audioBase64,
      body.transcript,
      body.mimeType || 'audio/webm',
    );
  }

  @Sse('text/analyze/stream')
  streamTextAnalyze(
    @Query('text') text = '',
    @Query('language') language = 'English',
  ): Observable<MessageEvent> {
    return this.orchestratorService.streamTextAnalysis(text, language);
  }
}
