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
  PronunciationAnalysisResult,
  TranscriptionResult,
  TtsResult,
} from './types';

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

  analyzeText(text: string, language: string): Promise<AnalyzeResult> {
    return this.textAi.analyzeText(text, language);
  }

  streamTextAnalysis(text: string, language: string): Observable<{ data: any }> {
    return this.textAi.streamTextAnalysis(text, language);
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

  generateTasks(language: string, level: string, skill?: string): Promise<GeneratedTask[]> {
    return this.tasks.generateTasks(language, level, skill);
  }

  generateListeningPassage(language: string, level: string): Promise<ListeningPassage> {
    return this.tasks.generateListeningPassage(language, level);
  }

  // ── Audio transcription ────────────────────────────────────────────────────

  transcribeAudio(
    audioBase64: string,
    mimeType: string,
    language: string,
  ): Promise<TranscriptionResult> {
    return this.speech.transcribe(audioBase64, mimeType, language);
  }

  // ── Pronunciation analysis ─────────────────────────────────────────────────
  // Orchestrates: SpeechService (Azure scores + alignment) → PronunciationAiService (GPT feedback)

  async analyzePronunciation(
    audioBase64: string,
    mimeType: string,
    referenceText: string,
    language: string,
  ): Promise<PronunciationAnalysisResult> {
    const safeLanguage = (language || 'English').trim() || 'English';

    const raw = await this.speech.analyzePronunciation(
      audioBase64,
      mimeType,
      referenceText,
      safeLanguage,
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

  // ── TTS ────────────────────────────────────────────────────────────────────

  synthesizeSpeech(text: string, language: string): Promise<TtsResult> {
    return this.tts.synthesize(text, language);
  }
}
