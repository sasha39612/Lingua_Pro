import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface AudioAnalysisResult {
  transcript: string;
  pronunciationScore: number;  // 0..1 — FROM AZURE via orchestrator
  feedback: string;            // FROM GPT via orchestrator
  phonemeHints: string[];      // FROM GPT via orchestrator
  confidence: number;          // 0..1
}

@Injectable()
export class AiOrchestratorService {
  private readonly orchestratorBaseUrl = process.env.AI_ORCHESTRATOR_URL;

  // ── Public API ─────────────────────────────────────────────────────────────
  // Single call to POST /audio/pronunciation/analyze — orchestrator handles
  // transcription (Azure/Whisper), scoring (Azure), and feedback (GPT).

  async analyzeAudio(
    audioBuffer: Buffer,
    mimeType: string,
    language: string,
    referenceText?: string,
  ): Promise<AudioAnalysisResult> {
    if (this.orchestratorBaseUrl) {
      try {
        const response = await axios.post(
          `${this.orchestratorBaseUrl.replace(/\/$/, '')}/audio/pronunciation/analyze`,
          {
            audioBase64: audioBuffer.toString('base64'),
            mimeType,
            referenceText: referenceText || '',
            language,
          },
          { timeout: 60_000 },
        );

        const d = response?.data;
        if (d?.pronunciationScore !== undefined) {
          return {
            transcript: String(d.transcript || ''),
            pronunciationScore: Number(d.pronunciationScore),
            feedback: String(d.feedback || ''),
            phonemeHints: Array.isArray(d.phonemeHints)
              ? d.phonemeHints.map((h: unknown) => String(h))
              : [],
            confidence: Number(d.accuracyScore ?? d.pronunciationScore ?? 0),
          };
        }
      } catch (error) {
        console.warn('AI orchestrator pronunciation analyze call failed, using fallback');
      }
    }

    // Local fallback — no orchestrator available
    return this.localFallback(language);
  }

  // ── Local fallback ─────────────────────────────────────────────────────────

  private localFallback(language: string): AudioAnalysisResult {
    const score = 0.75;
    return {
      transcript: '',
      pronunciationScore: score,
      feedback: 'Pronunciation analysis unavailable. Please try again later.',
      phonemeHints: this.phonemeHints(language),
      confidence: score,
    };
  }

  private phonemeHints(language: string): string[] {
    const lang = language.toLowerCase();
    if (lang.includes('english')) return ['/th/ in "think"', '/w/ vs /v/', 'final consonant release'];
    if (lang.includes('german')) return ['ich-Laut /ç/', 'ach-Laut /x/', 'umlaut clarity'];
    if (lang.includes('polish')) return ['sz/sh contrast', 'cz/ch contrast', 'nasal vowels'];
    if (lang.includes('albanian')) return ['ll vs l distinction', 'r vs rr trilling'];
    return ['consonant clarity', 'vowel length', 'word stress'];
  }
}
