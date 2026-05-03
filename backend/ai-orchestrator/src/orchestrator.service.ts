import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SpeechService } from './speech.service';
import { TextAiService } from './text-ai.service';
import { TaskService } from './task.service';
import { PronunciationAiService } from './pronunciation-ai.service';
import { TtsService } from './tts.service';
import type {
  AnalyzeResult,
  GeneratedTask,
  ListeningPassage,
  ListeningPassageV2,
  PronunciationAnalysisResult,
  TranscriptionResult,
  TtsResult,
  WritingAnalysisResult,
  WritingTask,
} from './types';
import type { WritingStreamEvent } from './text-ai.service';

@Injectable()
export class OrchestratorService {
  constructor(
    private readonly speech: SpeechService,
    private readonly textAi: TextAiService,
    private readonly tasks: TaskService,
    private readonly pronunciationAi: PronunciationAiService,
    private readonly tts: TtsService,
  ) {}

  // ── Text (reading / writing domain) ───────────────────────────────────────

  analyzeText(text: string, language: string, requestId?: string): Promise<AnalyzeResult> {
    return this.textAi.analyzeText(text, language, requestId);
  }

  streamTextAnalysis(text: string, language: string): Observable<{ data: any }> {
    return this.textAi.streamTextAnalysis(text, language);
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

  generateTasks(language: string, level: string, skill?: string, requestId?: string, topic?: string): Promise<GeneratedTask[]> {
    return this.tasks.generateTasks(language, level, skill, requestId, topic);
  }

  generateListeningPassage(language: string, level: string, requestId?: string): Promise<ListeningPassage> {
    return this.tasks.generateListeningPassage(language, level, requestId);
  }

  generateListeningExercise(language: string, level: string, requestId?: string, topic?: string): Promise<ListeningPassageV2> {
    return this.tasks.generateListeningExercise(language, level, requestId, topic);
  }

  // ── Audio transcription ────────────────────────────────────────────────────

  transcribeAudio(
    audioBase64: string,
    mimeType: string,
    language: string,
    requestId?: string,
  ): Promise<TranscriptionResult> {
    return this.speech.transcribe(audioBase64, mimeType, language, requestId);
  }

  // ── Pronunciation analysis ─────────────────────────────────────────────────
  // Orchestrates: SpeechService (Azure scores + alignment) → PronunciationAiService (GPT feedback)

  async analyzePronunciation(
    audioBase64: string,
    mimeType: string,
    referenceText: string,
    language: string,
    requestId?: string,
  ): Promise<PronunciationAnalysisResult> {
    const safeLanguage = (language || 'English').trim() || 'English';

    const raw = await this.speech.analyzePronunciation(
      audioBase64,
      mimeType,
      referenceText,
      safeLanguage,
      requestId,
    );

    let feedback = '';
    let phonemeHints: string[] = [];
    let source: PronunciationAnalysisResult['source'] = raw.source === 'azure' ? 'azure+gpt' : 'fallback';

    try {
      const gpt = await this.pronunciationAi.generateFeedback(
        referenceText,
        raw.transcript,
        safeLanguage,
        raw.scores,
        raw.words,
        raw.alignment,
        raw.phonemeSource,
        requestId,
      );
      feedback = gpt.feedback;
      phonemeHints = gpt.phonemeHints;
    } catch {
      // GPT failed — use azure scores but local feedback
      source = raw.source === 'azure' ? 'azure-only' : 'fallback';
      const { phonemeHintsByLanguage } = await import('./util');
      feedback =
        raw.scores.pronunciationScore > 0.85
          ? 'Strong pronunciation overall. Focus on natural rhythm and sentence stress.'
          : 'Pronunciation differs from the reference in several words. Slow down and repeat key syllables.';
      phonemeHints = phonemeHintsByLanguage(safeLanguage);
    }

    return {
      transcript: raw.transcript,
      pronunciationScore: raw.scores.pronunciationScore,
      accuracyScore: raw.scores.accuracyScore,
      fluencyScore: raw.scores.fluencyScore,
      completenessScore: raw.scores.completenessScore,
      prosodyScore: raw.scores.prosodyScore,
      feedback,
      phonemeHints,
      words: raw.words,
      alignment: raw.alignment,
      phonemeSource: raw.phonemeSource,
      source,
    };
  }

  // ── Writing task analysis ──────────────────────────────────────────────────

  analyzeWritingTask(text: string, language: string, taskContext: WritingTask, requestId?: string): Promise<WritingAnalysisResult> {
    return this.textAi.analyzeWritingTask(text, language, taskContext, requestId);
  }

  streamWritingAnalysis(text: string, language: string, taskContext: WritingTask, requestId?: string): AsyncGenerator<WritingStreamEvent> {
    return this.textAi.streamWritingAnalysis(text, language, taskContext, requestId);
  }

  // ── TTS ────────────────────────────────────────────────────────────────────

  synthesizeSpeech(text: string, language: string, requestId?: string): Promise<TtsResult> {
    return this.tts.synthesize(text, language, requestId);
  }
}
