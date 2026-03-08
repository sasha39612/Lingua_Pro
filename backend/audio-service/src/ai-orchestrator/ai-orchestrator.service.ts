import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';

@Injectable()
export class AiOrchestratorService {
  private readonly orchestratorBaseUrl = process.env.AI_ORCHESTRATOR_URL;
  private readonly whisperApiUrl = 'https://api.openai.com/v1/audio/transcriptions';
  private readonly openaiApiKey = process.env.OPENAI_API_KEY;

  async processAudioWithWhisper(
    audioBuffer: Buffer,
    language: string
  ): Promise<{
    transcript: string;
    language: string;
    confidence: number;
  }> {
    try {
      const transcript = await this.transcribeAudio(audioBuffer, language);
      const confidence = this.calculateConfidence(transcript);

      return {
        transcript,
        language,
        confidence
      };
    } catch (error) {
      console.error('AI Orchestrator error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to process audio: ${message}`);
    }
  }

  private async transcribeAudio(audioBuffer: Buffer, language: string): Promise<string> {
    if (this.orchestratorBaseUrl) {
      try {
        const response = await axios.post(
          `${this.orchestratorBaseUrl.replace(/\/$/, '')}/audio/transcribe`,
          {
            audioBase64: audioBuffer.toString('base64'),
            language
          },
          { timeout: 60000 }
        );

        if (response?.data?.transcript) {
          return String(response.data.transcript);
        }
      } catch (error) {
        console.warn('AI orchestrator transcription call failed, falling back to direct Whisper API');
      }
    }

    if (!this.openaiApiKey) {
      throw new BadRequestException('OPENAI_API_KEY is not configured');
    }

    const languageCode = this.mapLanguageToCode(language);
    return this.callWhisperApi(audioBuffer, languageCode);
  }

  private async callWhisperApi(audioBuffer: Buffer, languageCode: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', audioBuffer, 'audio.wav');
    formData.append('model', 'whisper-1');
    formData.append('language', languageCode);

    const response = await axios.post(this.whisperApiUrl, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${this.openaiApiKey}`
      },
      timeout: 60000
    });

    if (!response.data.text) {
      throw new Error('No transcription returned from Whisper API');
    }

    return response.data.text;
  }

  private mapLanguageToCode(language: string): string {
    const languageMap: { [key: string]: string } = {
      english: 'en',
      spanish: 'es',
      spanish_latin: 'es',
      french: 'fr',
      german: 'de',
      portuguese: 'pt',
      portuguese_br: 'pt',
      italian: 'it',
      dutch: 'nl',
      russian: 'ru',
      chinese: 'zh',
      japanese: 'ja',
      korean: 'ko',
      arabic: 'ar',
      hindi: 'hi',
      polish: 'pl',
      turkish: 'tr',
      vietnamese: 'vi',
      thai: 'th',
      swedish: 'sv',
      norwegian: 'no',
      danish: 'da',
      finnish: 'fi',
      czech: 'cs',
      romanian: 'ro',
      greek: 'el',
      hebrew: 'he',
      indonesian: 'id',
      ukrainian: 'uk'
    };

    const code = languageMap[language.toLowerCase()];
    if (!code) {
      console.warn(`Language "${language}" not found, defaulting to English`);
      return 'en';
    }
    return code;
  }

  private calculateConfidence(transcript: string): number {
    // Mock confidence calculation - in production, use Whisper's confidence scores
    if (!transcript || transcript.length === 0) return 0;
    if (transcript.length < 10) return 0.5;
    return Math.min(0.95, 0.7 + (transcript.length / 1000) * 0.25);
  }

  async analyzePronunciation(
    transcript: string,
    language: string,
    expectedText?: string
  ): Promise<{
    score: number;
    feedback: string;
    suggestions: string[];
  }> {
    if (this.orchestratorBaseUrl) {
      try {
        const response = await axios.post(
          `${this.orchestratorBaseUrl.replace(/\/$/, '')}/audio/pronunciation`,
          {
            transcript,
            language,
            expectedText
          },
          { timeout: 30000 }
        );

        if (response?.data?.score !== undefined) {
          return {
            score: Number(response.data.score),
            feedback: String(response.data.feedback || ''),
            suggestions: Array.isArray(response.data.suggestions)
              ? response.data.suggestions.map((s: unknown) => String(s))
              : []
          };
        }
      } catch (error) {
        console.warn('AI orchestrator pronunciation call failed, using fallback analysis');
      }
    }

    // Fallback analysis when orchestrator endpoint is unavailable.
    const score = this.calculatePronunciationScore(transcript, expectedText);

    return {
      score,
      feedback: this.generatePronunciationFeedback(score),
      suggestions: this.generateSuggestions(language, score)
    };
  }

  private calculatePronunciationScore(transcript: string, expectedText?: string): number {
    // Mock implementation
    if (!expectedText) return 0.8;
    
    const similarity = this.calculateSimilarity(transcript, expectedText);
    return Math.min(0.95, similarity);
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private getEditDistance(s1: string, s2: string): number {
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  private generatePronunciationFeedback(score: number): string {
    if (score >= 0.9) return 'Excellent pronunciation!';
    if (score >= 0.8) return 'Good pronunciation with minor improvements needed.';
    if (score >= 0.7) return 'Acceptable pronunciation, practice more.';
    if (score >= 0.6) return 'Needs improvement. Focus on clarity and pace.';
    return 'Significant improvement needed. Practice regularly.';
  }

  private generateSuggestions(language: string, score: number): string[] {
    const suggestions: string[] = [];

    if (score < 0.8) {
      suggestions.push('Speak more slowly and clearly.');
    }
    if (score < 0.7) {
      suggestions.push('Pay attention to stress and intonation.');
    }
    
    const languageSpecificTips: { [key: string]: string[] } = {
      english: ['Focus on vowel sounds', 'Practice consonant combinations'],
      spanish: ['Pay attention to rolling R sounds', 'Practice the TH sound'],
      french: ['Work on nasal vowels', 'Practice the R sound'],
      german: ['Focus on umlauts', 'Practice guttural sounds'],
      chinese: ['Practice tones carefully', 'Work on tonal distinction']
    };

    if (languageSpecificTips[language.toLowerCase()]) {
      suggestions.push(...languageSpecificTips[language.toLowerCase()]);
    }

    return suggestions.slice(0, 3);
  }
}
