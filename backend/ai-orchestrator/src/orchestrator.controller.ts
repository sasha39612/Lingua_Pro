import { Body, Controller, MessageEvent, Post, Query, Sse } from '@nestjs/common';
import { IsObject, IsOptional, IsString } from 'class-validator';
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
  async analyzeText(@Body() body: AnalyzeTextDto) {
    return this.orchestratorService.analyzeText(body.text, body.language);
  }

  @Post('tasks/generate')
  async generateTasks(@Body() body: GenerateTasksDto) {
    return {
      tasks: await this.orchestratorService.generateTasks(body.language, body.level, body.skill),
    };
  }

  @Post('tasks/generate-listening')
  async generateListeningPassage(@Body() body: GenerateListeningDto) {
    if (body.version === '2') {
      return this.orchestratorService.generateListeningExercise(body.language, body.level);
    }
    return this.orchestratorService.generateListeningPassage(body.language, body.level);
  }

  @Post('audio/transcribe')
  async transcribeAudio(@Body() body: TranscribeAudioDto) {
    return this.orchestratorService.transcribeAudio(
      body.audioBase64,
      body.mimeType || 'audio/webm',
      body.language || 'English',
    );
  }

  @Post('audio/pronunciation/analyze')
  async analyzePronunciation(@Body() body: PronunciationAnalyzeDto) {
    return this.orchestratorService.analyzePronunciation(
      body.audioBase64 || '',
      body.mimeType || 'audio/webm',
      body.referenceText,
      body.language,
    );
  }

  @Post('audio/tts')
  async generateSpeech(@Body() body: GenerateSpeechDto) {
    return this.orchestratorService.synthesizeSpeech(body.text, body.language);
  }

  @Post('text/analyze-writing')
  async analyzeWriting(@Body() body: AnalyzeWritingDto) {
    return this.orchestratorService.analyzeWritingTask(body.text, body.language, body.taskContext as any);
  }

  @Sse('text/analyze/stream')
  streamTextAnalyze(
    @Query('text') text = '',
    @Query('language') language = 'English',
  ): Observable<MessageEvent> {
    return this.orchestratorService.streamTextAnalysis(text, language);
  }
}
