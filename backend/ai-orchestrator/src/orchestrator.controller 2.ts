import { Body, Controller, Headers, MessageEvent, Post, Query, Sse } from '@nestjs/common';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { randomUUID } from 'crypto';
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

class GenerateListeningDto {
  @IsString()
  language!: string;

  @IsString()
  level!: string;

  @IsOptional()
  @IsString()
  version?: string;
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

class PronunciationAnalyzeDto {
  @IsString()
  referenceText!: string;

  @IsString()
  language!: string;

  @IsOptional()
  @IsString()
  audioBase64?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

class GenerateSpeechDto {
  @IsString()
  text!: string;

  @IsString()
  language!: string;
}

class AnalyzeWritingDto {
  @IsString()
  text!: string;

  @IsString()
  language!: string;

  @IsObject()
  taskContext!: Record<string, any>;
}

@Controller()
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('text/analyze')
  async analyzeText(
    @Body() body: AnalyzeTextDto,
    @Headers('x-request-id') requestIdHeader?: string,
  ) {
    const requestId = requestIdHeader || randomUUID();
    return this.orchestratorService.analyzeText(body.text, body.language, requestId);
  }

  @Post('tasks/generate')
  async generateTasks(
    @Body() body: GenerateTasksDto,
    @Headers('x-request-id') requestIdHeader?: string,
  ) {
    const requestId = requestIdHeader || randomUUID();
    return {
      tasks: await this.orchestratorService.generateTasks(body.language, body.level, body.skill, requestId),
    };
  }

  @Post('tasks/generate-listening')
  async generateListeningPassage(
    @Body() body: GenerateListeningDto,
    @Headers('x-request-id') requestIdHeader?: string,
  ) {
    const requestId = requestIdHeader || randomUUID();
    if (body.version === '2') {
      return this.orchestratorService.generateListeningExercise(body.language, body.level, requestId);
    }
    return this.orchestratorService.generateListeningPassage(body.language, body.level, requestId);
  }

  @Post('audio/transcribe')
  async transcribeAudio(
    @Body() body: TranscribeAudioDto,
    @Headers('x-request-id') requestIdHeader?: string,
  ) {
    const requestId = requestIdHeader || randomUUID();
    return this.orchestratorService.transcribeAudio(
      body.audioBase64,
      body.mimeType || 'audio/webm',
      body.language || 'English',
      requestId,
    );
  }

  @Post('audio/pronunciation/analyze')
  async analyzePronunciation(
    @Body() body: PronunciationAnalyzeDto,
    @Headers('x-request-id') requestIdHeader?: string,
  ) {
    const requestId = requestIdHeader || randomUUID();
    return this.orchestratorService.analyzePronunciation(
      body.audioBase64 || '',
      body.mimeType || 'audio/webm',
      body.referenceText,
      body.language,
      requestId,
    );
  }

  @Post('audio/tts')
  async generateSpeech(
    @Body() body: GenerateSpeechDto,
    @Headers('x-request-id') requestIdHeader?: string,
  ) {
    const requestId = requestIdHeader || randomUUID();
    return this.orchestratorService.synthesizeSpeech(body.text, body.language, requestId);
  }

  @Post('text/analyze-writing')
  async analyzeWriting(
    @Body() body: AnalyzeWritingDto,
    @Headers('x-request-id') requestIdHeader?: string,
  ) {
    const requestId = requestIdHeader || randomUUID();
    return this.orchestratorService.analyzeWritingTask(body.text, body.language, body.taskContext as any, requestId);
  }

  @Sse('text/analyze/stream')
  streamTextAnalyze(
    @Query('text') text = '',
    @Query('language') language = 'English',
  ): Observable<MessageEvent> {
    return this.orchestratorService.streamTextAnalysis(text, language);
  }
}
