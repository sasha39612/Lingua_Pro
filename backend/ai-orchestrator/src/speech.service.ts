import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import type { TranscriptionResult, WordDetail } from './types';
import type { WordAlignment } from './types';
import {
  decodeBase64,
  mapLanguageToLocale,
  mapLanguageToCode,
  withRetry,
  withRetryTracked,
  withTimeout,
  computeWordAlignment,
  normalizedEditDistance,
} from './util';
import { G2pService } from './g2p.service';
import { AiUsageService } from './usage/ai-usage.service';
import { classifyError } from './usage/error-type';

// Azure Speech SDK — imported dynamically to allow the service to run
// without the SDK installed (e.g. in test environments)
type SpeechSDK = typeof import('microsoft-cognitiveservices-speech-sdk');

export type AzurePronunciationScores = {
  pronunciationScore: number; // 0..1
  accuracyScore: number;      // 0..1
  fluencyScore: number;       // 0..1
  completenessScore: number;  // 0..1
  prosodyScore: number | null; // 0..1; null when prosody unavailable in this region
};

export type PronunciationAnalysisRaw = {
  scores: AzurePronunciationScores;
  transcript: string;
  words: WordDetail[];
  alignment: WordAlignment[];
  source: 'azure' | 'fallback';
  phonemeSource: 'acoustic' | 'g2p' | 'none';
};

@Injectable()
export class SpeechService {
  private readonly logger = new Logger(SpeechService.name);

  private readonly azureKey: string | null;
  private readonly azureRegion: string | null;
  private readonly openai: OpenAI | null;
  private readonly transcriptionModel: string;
  private ffmpegAvailable = false;
  private sdk: SpeechSDK | null = null;

  constructor(private readonly g2p: G2pService, private readonly aiUsage: AiUsageService) {
    this.azureKey = process.env.AZURE_SPEECH_KEY || null;
    this.azureRegion = process.env.AZURE_SPEECH_REGION || null;
    const apiKey = process.env.AI_API_KEY;
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
    this.transcriptionModel = process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1';

    this.probeFFmpeg();
    if (this.azureKey && this.azureRegion) {
      this.loadSdk();
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async transcribe(
    audioBase64: string,
    mimeType: string,
    language: string,
    requestId?: string,
  ): Promise<TranscriptionResult> {
    const safeLanguage = (language || 'English').trim() || 'English';
    const buffer = decodeBase64(audioBase64);

    if (!buffer) {
      return this.offlineFallback(safeLanguage);
    }

    if (buffer.length > 10_485_760) {
      throw new Error(`Audio buffer exceeds 10 MB limit (got ${Math.round(buffer.length / 1_048_576)} MB)`);
    }

    // Try Azure path
    if (this.azureKey && this.azureRegion && this.sdk) {
      const start = Date.now();
      let attempts = 0;
      try {
        const wavBuffer = this.ffmpegAvailable
          ? await this.convertToWav(buffer)
          : buffer;
        // 16kHz mono 16-bit PCM: 32000 bytes/sec; subtract 44-byte WAV header
        const audioDurationSec = Math.max(0, (wavBuffer.length - 44)) / 32_000;
        const { result, attempts: a } = await withRetryTracked(
          () => this.transcribeWithAzure(wavBuffer, safeLanguage),
          'transcribeAudio',
          this.logger,
        );
        attempts = a;
        void this.aiUsage.log({
          success: true,
          featureType: 'transcribe',
          endpoint: 'transcribeWithAzure',
          model: 'azure-speech',
          requestType: 'sync',
          audioDurationSec,
          durationMs: Date.now() - start,
          retryCount: attempts - 1,
          requestId,
          language: safeLanguage,
        });
        return result;
      } catch (err) {
        void this.aiUsage.log({
          success: false,
          featureType: 'transcribe',
          endpoint: 'transcribeWithAzure',
          model: 'azure-speech',
          requestType: 'sync',
          errorType: classifyError(err).type,
          durationMs: Date.now() - start,
          retryCount: attempts > 0 ? attempts - 1 : 0,
          requestId,
          language: safeLanguage,
        });
        this.logger.warn(`Azure transcription failed, falling back to Whisper: ${(err as Error).message}`);
      }
    }

    // Whisper fallback
    if (this.openai) {
      const start = Date.now();
      let attempts = 0;
      try {
        const { result, attempts: a } = await withRetryTracked(
          () => this.transcribeWithWhisper(buffer, mimeType, safeLanguage),
          'transcribeAudio:whisper',
          this.logger,
        );
        attempts = a;
        // Whisper pricing is per-minute; estimate duration from buffer size
        // WebM audio averages ~16KB/s at typical quality settings
        const audioDurationSec = buffer.length / 16_000;
        void this.aiUsage.log({
          success: true,
          featureType: 'transcribe',
          endpoint: 'transcribeWithWhisper',
          model: this.transcriptionModel,
          requestType: 'fallback',  // Azure failed or unavailable → Whisper ran
          audioDurationSec,
          durationMs: Date.now() - start,
          retryCount: attempts - 1,
          requestId,
          language: safeLanguage,
        });
        return result;
      } catch (err) {
        void this.aiUsage.log({
          success: false,
          featureType: 'transcribe',
          endpoint: 'transcribeWithWhisper',
          model: this.transcriptionModel,
          requestType: 'fallback',
          errorType: classifyError(err).type,
          durationMs: Date.now() - start,
          retryCount: attempts > 0 ? attempts - 1 : 0,
          requestId,
          language: safeLanguage,
        });
        this.logger.warn(`Whisper transcription failed: ${(err as Error).message}`);
      }
    }

    return this.offlineFallback(safeLanguage);
  }

  async analyzePronunciation(
    audioBase64: string,
    mimeType: string,
    referenceText: string,
    language: string,
    requestId?: string,
  ): Promise<PronunciationAnalysisRaw> {
    const safeLanguage = (language || 'English').trim() || 'English';
    const buffer = decodeBase64(audioBase64);

    if (!buffer) {
      return this.pronunciationFallback(referenceText, safeLanguage);
    }

    if (buffer.length > 10_485_760) {
      throw new Error(`Audio buffer exceeds 10 MB limit (got ${Math.round(buffer.length / 1_048_576)} MB)`);
    }

    if (this.azureKey && this.azureRegion && this.sdk) {
      const start = Date.now();
      let attempts = 0;
      try {
        const wavBuffer = this.ffmpegAvailable
          ? await this.convertToWav(buffer)
          : buffer;
        const audioDurationSec = Math.max(0, (wavBuffer.length - 44)) / 32_000;
        const { result, attempts: a } = await withRetryTracked(
          () => this.analyzePronunciationWithAzure(wavBuffer, referenceText, safeLanguage),
          'analyzePronunciation',
          this.logger,
        );
        attempts = a;
        void this.aiUsage.log({
          success: true,
          featureType: 'pronunciation',
          endpoint: 'analyzePronunciationWithAzure',
          model: 'azure-speech',
          requestType: 'sync',
          audioDurationSec,
          durationMs: Date.now() - start,
          retryCount: attempts - 1,
          requestId,
          language: safeLanguage,
        });
        return result;
      } catch (err) {
        void this.aiUsage.log({
          success: false,
          featureType: 'pronunciation',
          endpoint: 'analyzePronunciationWithAzure',
          model: 'azure-speech',
          requestType: 'sync',
          errorType: classifyError(err).type,
          durationMs: Date.now() - start,
          retryCount: attempts > 0 ? attempts - 1 : 0,
          requestId,
          language: safeLanguage,
        });
        this.logger.warn(`Azure pronunciation analysis failed, using fallback: ${(err as Error).message}`);
      }
    }

    // No Azure — get a transcript via Whisper, compute local scores
    let transcript = '';
    if (this.openai) {
      const start = Date.now();
      let attempts = 0;
      try {
        const { result, attempts: a } = await withRetryTracked(
          () => this.transcribeWithWhisper(buffer, mimeType, safeLanguage),
          'pronunciationWhisperFallback',
          this.logger,
          1,  // 1 attempt — non-critical path
        );
        attempts = a;
        transcript = result.transcript;
        void this.aiUsage.log({
          success: true,
          featureType: 'transcribe',
          endpoint: 'transcribeWithWhisper',
          model: this.transcriptionModel,
          requestType: 'fallback',
          durationMs: Date.now() - start,
          retryCount: attempts - 1,
          requestId,
          language: safeLanguage,
        });
      } catch (err) {
        void this.aiUsage.log({
          success: false,
          featureType: 'transcribe',
          endpoint: 'transcribeWithWhisper',
          model: this.transcriptionModel,
          requestType: 'fallback',
          errorType: classifyError(err).type,
          durationMs: Date.now() - start,
          retryCount: attempts > 0 ? attempts - 1 : 0,
          requestId,
          language: safeLanguage,
        });
        // ignore — use empty transcript for fallback scoring
      }
    }

    return this.pronunciationFallback(referenceText, safeLanguage, transcript);
  }

  // ── FFmpeg conversion ──────────────────────────────────────────────────────
  // Converts any audio format → 16 kHz mono PCM WAV (required by Azure SDK)

  async convertToWav(inputBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-ar', '16000',
        '-ac', '1',
        '-f', 'wav',
        'pipe:1',
      ]);

      const chunks: Buffer[] = [];
      let stderr = '';

      ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
      ffmpeg.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

      const timer = setTimeout(() => {
        ffmpeg.kill();
        reject(new Error('FFmpeg conversion timed out'));
      }, 10_000);

      ffmpeg.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-200)}`));
        } else {
          resolve(Buffer.concat(chunks));
        }
      });

      ffmpeg.stdin.write(inputBuffer);
      ffmpeg.stdin.end();
    });
  }

  // ── Azure transcription ────────────────────────────────────────────────────

  private async transcribeWithAzure(
    wavBuffer: Buffer,
    language: string,
  ): Promise<TranscriptionResult> {
    const sdk = this.sdk!;
    const tmpFile = await this.writeTempWav(wavBuffer);

    try {
      const speechConfig = sdk.SpeechConfig.fromSubscription(this.azureKey!, this.azureRegion!);
      speechConfig.speechRecognitionLanguage = mapLanguageToLocale(language);

      const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(tmpFile));
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      return await withTimeout(
        new Promise<TranscriptionResult>((resolve, reject) => {
          recognizer.recognizeOnceAsync(
            (result) => {
              recognizer.close();
              const json = this.parseResultJson(result);
              const confidence = json?.NBest?.[0]?.Confidence ?? 0.8;
              resolve({
                transcript: result.text || '',
                language,
                confidence: Math.min(1, Math.max(0, confidence)),
                words: [],
                source: 'azure',
              });
            },
            (err) => {
              recognizer.close();
              reject(new Error(String(err)));
            },
          );
        }),
        25_000,
        'Azure transcription timed out',
      );
    } finally {
      this.cleanTempFile(tmpFile);
    }
  }

  // ── Azure pronunciation assessment ─────────────────────────────────────────

  private async analyzePronunciationWithAzure(
    wavBuffer: Buffer,
    referenceText: string,
    language: string,
  ): Promise<PronunciationAnalysisRaw> {
    const sdk = this.sdk!;
    const tmpFile = await this.writeTempWav(wavBuffer);

    try {
      const speechConfig = sdk.SpeechConfig.fromSubscription(this.azureKey!, this.azureRegion!);
      speechConfig.speechRecognitionLanguage = mapLanguageToLocale(language);

      const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(tmpFile));

      const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
        referenceText,
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Phoneme,
        true, // enableMiscue
      );
      pronunciationConfig.enableProsodyAssessment = true;

      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      pronunciationConfig.applyTo(recognizer);

      return await withTimeout(
        new Promise<PronunciationAnalysisRaw>((resolve, reject) => {
          recognizer.recognizeOnceAsync(
            (result) => {
              recognizer.close();
              const json = this.parseResultJson(result);
              const pa = json?.NBest?.[0]?.PronunciationAssessment;

              const scores: AzurePronunciationScores = {
                pronunciationScore: this.normalizeAzureScore(pa?.PronunciationScore),
                accuracyScore: this.normalizeAzureScore(pa?.AccuracyScore),
                fluencyScore: this.normalizeAzureScore(pa?.FluencyScore),
                completenessScore: this.normalizeAzureScore(pa?.CompletenessScore),
                prosodyScore: pa?.ProsodyScore != null ? this.normalizeAzureScore(pa.ProsodyScore) : null,
              };

              const words = this.parseWords(json?.NBest?.[0]?.Words ?? []);
              const alignment = computeWordAlignment(referenceText, words);

              resolve({
                scores,
                transcript: result.text || '',
                words,
                alignment,
                source: 'azure',
                phonemeSource: 'acoustic',
              });
            },
            (err) => {
              recognizer.close();
              reject(new Error(String(err)));
            },
          );
        }),
        25_000,
        'Azure pronunciation assessment timed out',
      );
    } finally {
      this.cleanTempFile(tmpFile);
    }
  }

  // ── Whisper fallback ───────────────────────────────────────────────────────

  private async transcribeWithWhisper(
    buffer: Buffer,
    mimeType: string,
    language: string,
  ): Promise<TranscriptionResult> {
    const ext = mimeType === 'audio/wav' || mimeType === 'audio/x-wav' ? 'wav'
      : mimeType === 'audio/mpeg' || mimeType === 'audio/mp3' ? 'mp3'
      : mimeType === 'audio/mp4' || mimeType === 'audio/x-m4a' ? 'm4a'
      : mimeType === 'audio/ogg' ? 'ogg'
      : 'webm';

    const file = await toFile(buffer, `audio.${ext}`, { type: mimeType || 'audio/webm' });
    const response = await withTimeout(
      this.openai!.audio.transcriptions.create({
        model: this.transcriptionModel,
        file,
        language: mapLanguageToCode(language),
      }),
      25_000,
      'Whisper transcription timed out',
    );

    return {
      transcript: (response.text || '').trim(),
      language,
      confidence: 0.88,
      words: [],
      source: 'whisper',
    };
  }

  // ── Azure JSON parsing helpers ─────────────────────────────────────────────

  private parseResultJson(result: any): any {
    try {
      const raw = result?.properties?.getProperty('SpeechServiceResponse_JsonResult') ?? '';
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private parseWords(rawWords: any[]): WordDetail[] {
    if (!Array.isArray(rawWords)) return [];
    return rawWords.map((w): WordDetail => ({
      word: String(w?.Word ?? ''),
      accuracyScore: Number(w?.PronunciationAssessment?.AccuracyScore ?? 0),
      errorType: this.normalizeErrorType(w?.PronunciationAssessment?.ErrorType),
      phonemes: this.parsePhonemes(w?.Phonemes ?? []),
    }));
  }

  private parsePhonemes(rawPhonemes: any[]): import('./types').PhonemeDetail[] {
    if (!Array.isArray(rawPhonemes)) return [];
    return rawPhonemes.map((p) => ({
      phoneme: String(p?.Phoneme ?? ''),
      accuracyScore: Number(p?.PronunciationAssessment?.AccuracyScore ?? 0),
      offset: Math.round(Number(p?.Offset ?? 0) / 10_000),   // 100ns ticks → ms
      duration: Math.round(Number(p?.Duration ?? 0) / 10_000),
    }));
  }

  private normalizeErrorType(raw: string | undefined): WordDetail['errorType'] {
    const valid = ['None', 'Omission', 'Insertion', 'Mispronunciation'] as const;
    return valid.includes(raw as any) ? (raw as WordDetail['errorType']) : 'None';
  }

  private normalizeAzureScore(value: number | undefined): number {
    // Azure returns 0..100 → normalise to 0..1
    if (typeof value !== 'number' || Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(1, Number((value / 100).toFixed(2))));
  }

  // ── Temp file helpers ──────────────────────────────────────────────────────

  private async writeTempWav(buffer: Buffer): Promise<string> {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'azure-'));
    const filePath = path.join(dir, 'audio.wav');
    await fs.promises.writeFile(filePath, buffer);
    return filePath;
  }

  private cleanTempFile(filePath: string): void {
    try {
      fs.unlinkSync(filePath);
      fs.rmdirSync(path.dirname(filePath));
    } catch {
      // best-effort cleanup
    }
  }

  // ── Fallbacks ──────────────────────────────────────────────────────────────

  private offlineFallback(language: string): TranscriptionResult {
    return {
      transcript: `Transcription unavailable right now for ${language}; fallback transcript generated.`,
      language,
      confidence: 0.1,
      words: [],
      source: 'fallback',
    };
  }

  private pronunciationFallback(
    referenceText: string,
    language: string,
    transcript = '',
  ): PronunciationAnalysisRaw {
    if (!transcript) {
      return {
        scores: { pronunciationScore: 0.5, accuracyScore: 0.5, fluencyScore: 0.5, completenessScore: 0.5, prosodyScore: null },
        transcript: referenceText,
        words: [],
        alignment: computeWordAlignment(referenceText, []),
        source: 'fallback',
        phonemeSource: 'none',
      };
    }

    // Build spoken WordDetail[] with placeholder scores — updated below after alignment.
    const spokenWords: import('./types').WordDetail[] = transcript
      .replace(/[^\p{L}\p{N}'\s]/gu, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => ({
        word: w,
        accuracyScore: 0,        // filled in after alignment
        errorType: 'None' as const,
        phonemes: [],
      }));

    // Align reference vs spoken — uses Levenshtein at word level.
    const alignment = computeWordAlignment(referenceText, spokenWords);

    // Per-word scoring. Scores are stored as 0..100 to match Azure's WordDetail scale.
    // wordDetail.phonemes stays [] — we never attach fake acoustic scores.
    // G2P data goes into entry.g2pHints (text-based IPA, clearly not acoustic).
    let usedG2p = false;
    for (const entry of alignment) {
      if (!entry.wordDetail || entry.spoken === null) continue;

      if (this.g2p.isAvailable() && entry.type === 'mispronounced') {
        const diff = this.g2p.diffWords(entry.expected, entry.spoken, language);
        entry.wordDetail.accuracyScore = Math.round(diff.score * 100);
        // Store IPA data as text-based hints — source clearly labeled, no fake scores
        entry.g2pHints = {
          expectedIpa: this.g2p.splitIpa(this.g2p.wordToIpa(entry.expected, language)),
          spokenIpa:   this.g2p.splitIpa(this.g2p.wordToIpa(entry.spoken,   language)),
          errorPhonemes: diff.errorPhonemes,
        };
        usedG2p = true;
      } else {
        // Character-level edit distance fallback (0..1 → scale to 0..100)
        entry.wordDetail.accuracyScore = Math.round(normalizedEditDistance(entry.expected, entry.spoken) * 100);
      }
    }
    const phonemeSource = usedG2p ? 'g2p' as const : 'none' as const;

    // Aggregate scores. Word accuracyScores are 0..100 — normalise to 0..1 for the formula.
    const wordScores = spokenWords.map((w) => w.accuracyScore / 100);
    const meanAccuracy = wordScores.length
      ? wordScores.reduce((s, v) => s + v, 0) / wordScores.length
      : 0.5;

    // Completeness = fraction of reference words that were spoken (not missing).
    const refWordCount = referenceText.replace(/[^\p{L}\p{N}'\s]/gu, '').split(/\s+/).filter(Boolean).length;
    const missingCount = alignment.filter((e) => e.type === 'missing').length;
    const completeness = refWordCount > 0 ? Math.max(0, (refWordCount - missingCount) / refWordCount) : 0.5;

    // Word correctness rate penalises wrong words (mispronounced) beyond just their accuracy score.
    const mispronounced = alignment.filter((e) => e.type === 'mispronounced').length;
    const wordCorrectRate = refWordCount > 0 ? Math.max(0, (refWordCount - missingCount - mispronounced) / refWordCount) : 0.5;

    // Overall pronunciation score: accuracy + completeness + word correctness.
    const pronunciationScore = Math.max(0.1, Math.min(0.98, 0.5 * meanAccuracy + 0.25 * completeness + 0.25 * wordCorrectRate));

    return {
      scores: {
        pronunciationScore,
        accuracyScore: meanAccuracy,
        fluencyScore: meanAccuracy,       // no timing data in Whisper fallback
        completenessScore: completeness,
        prosodyScore: null,
      },
      transcript,
      words: spokenWords,
      alignment,
      source: 'fallback',
      phonemeSource,
    };
  }

  // ── Startup probes ─────────────────────────────────────────────────────────

  private probeFFmpeg(): void {
    try {
      const proc = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
      proc.on('close', (code) => {
        this.ffmpegAvailable = code === 0;
        if (!this.ffmpegAvailable) {
          this.logger.warn('FFmpeg not found — audio conversion disabled; sending raw buffer to Whisper');
        }
      });
      proc.on('error', () => {
        this.ffmpegAvailable = false;
        this.logger.warn('FFmpeg not found — audio conversion disabled; sending raw buffer to Whisper');
      });
    } catch {
      this.ffmpegAvailable = false;
    }
  }

  private async loadSdk(): Promise<void> {
    try {
      this.sdk = await import('microsoft-cognitiveservices-speech-sdk');
    } catch (err) {
      this.logger.warn(`Azure Speech SDK not available: ${(err as Error).message}`);
      this.sdk = null;
    }
  }
}
