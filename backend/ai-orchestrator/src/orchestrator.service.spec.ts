import { vi } from 'vitest';
import { OrchestratorService } from './orchestrator.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeService() {
  const mockSpeech = {
    transcribe: vi.fn(),
    analyzePronunciation: vi.fn(),
  };
  const mockTextAi = {
    analyzeText: vi.fn(),
    streamTextAnalysis: vi.fn(),
  };
  const mockTasks = {
    generateTasks: vi.fn(),
  };
  const mockPronunciationAi = {
    generateFeedback: vi.fn(),
  };
  const mockTts = {
    synthesize: vi.fn(),
  };

  const svc = new OrchestratorService(
    mockSpeech as any,
    mockTextAi as any,
    mockTasks as any,
    mockPronunciationAi as any,
    mockTts as any,
  );

  return { svc, mockSpeech, mockTextAi, mockTasks, mockPronunciationAi, mockTts };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OrchestratorService — facade delegation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('analyzeText delegates to TextAiService', async () => {
    const { svc, mockTextAi } = makeService();
    const expected = { correctedText: 'Hi.', feedback: 'Good', textScore: 0.9 };
    mockTextAi.analyzeText.mockResolvedValue(expected);

    const result = await svc.analyzeText('Hi', 'English');

    expect(mockTextAi.analyzeText).toHaveBeenCalledWith('Hi', 'English', undefined);
    expect(result).toEqual(expected);
  });

  it('streamTextAnalysis delegates to TextAiService', () => {
    const { svc, mockTextAi } = makeService();
    const fakeObs = Symbol('obs');
    mockTextAi.streamTextAnalysis.mockReturnValue(fakeObs);

    const result = svc.streamTextAnalysis('text', 'English');

    expect(mockTextAi.streamTextAnalysis).toHaveBeenCalledWith('text', 'English');
    expect(result).toBe(fakeObs);
  });

  it('generateTasks delegates to TaskService', async () => {
    const { svc, mockTasks } = makeService();
    const tasks = [{ prompt: 'Read this' }];
    mockTasks.generateTasks.mockResolvedValue(tasks);

    const result = await svc.generateTasks('English', 'A1', 'reading');

    expect(mockTasks.generateTasks).toHaveBeenCalledWith('English', 'A1', 'reading');
    expect(result).toEqual(tasks);
  });

  it('transcribeAudio delegates to SpeechService', async () => {
    const { svc, mockSpeech } = makeService();
    const transcription = { transcript: 'Hello', language: 'English', confidence: 0.9, words: [], source: 'azure' };
    mockSpeech.transcribe.mockResolvedValue(transcription);

    const result = await svc.transcribeAudio('base64', 'audio/webm', 'English');

    expect(mockSpeech.transcribe).toHaveBeenCalledWith('base64', 'audio/webm', 'English');
    expect(result).toEqual(transcription);
  });

  it('synthesizeSpeech delegates to TtsService', async () => {
    const { svc, mockTts } = makeService();
    const ttsResult = { audioBase64: 'abc123', mimeType: 'audio/mpeg', durationEstimateMs: 2000 };
    mockTts.synthesize.mockResolvedValue(ttsResult);

    const result = await svc.synthesizeSpeech('Hello world', 'English');

    expect(mockTts.synthesize).toHaveBeenCalledWith('Hello world', 'English');
    expect(result).toEqual(ttsResult);
  });

  describe('analyzePronunciation', () => {
    it('calls SpeechService then PronunciationAiService and assembles result', async () => {
      const { svc, mockSpeech, mockPronunciationAi } = makeService();

      mockSpeech.analyzePronunciation.mockResolvedValue({
        scores: { pronunciationScore: 0.85, accuracyScore: 0.88, fluencyScore: 0.82, completenessScore: 0.9, prosodyScore: null },
        transcript: 'Hello world',
        words: [],
        alignment: [],
        source: 'azure',
        phonemeSource: 'acoustic',
      });
      mockPronunciationAi.generateFeedback.mockResolvedValue({
        feedback: 'Great job!',
        phonemeHints: ['/th/ in "think"'],
      });

      const result = await svc.analyzePronunciation('base64', 'audio/webm', 'Hello world', 'English');

      expect(mockSpeech.analyzePronunciation).toHaveBeenCalledWith('base64', 'audio/webm', 'Hello world', 'English');
      expect(mockPronunciationAi.generateFeedback).toHaveBeenCalledWith(
        'Hello world',
        'Hello world',
        'English',
        expect.objectContaining({ pronunciationScore: 0.85 }),
        [],
        [],
        'acoustic',
      );
      expect(result.pronunciationScore).toBe(0.85);
      expect(result.feedback).toBe('Great job!');
      expect(result.source).toBe('azure+gpt');
    });

    it('uses azure-only source when GPT feedback fails', async () => {
      const { svc, mockSpeech, mockPronunciationAi } = makeService();

      mockSpeech.analyzePronunciation.mockResolvedValue({
        scores: { pronunciationScore: 0.7, accuracyScore: 0.7, fluencyScore: 0.7, completenessScore: 0.7, prosodyScore: null },
        transcript: 'Hello',
        words: [],
        alignment: [],
        source: 'azure',
        phonemeSource: 'acoustic',
      });
      mockPronunciationAi.generateFeedback.mockRejectedValue(new Error('GPT down'));

      const result = await svc.analyzePronunciation('base64', 'audio/webm', 'Hello', 'English');

      expect(result.source).toBe('azure-only');
      expect(result.pronunciationScore).toBe(0.7);
      expect(typeof result.feedback).toBe('string');
    });

    it('sets source to fallback when SpeechService returns fallback', async () => {
      const { svc, mockSpeech, mockPronunciationAi } = makeService();

      mockSpeech.analyzePronunciation.mockResolvedValue({
        scores: { pronunciationScore: 0.5, accuracyScore: 0.5, fluencyScore: 0.5, completenessScore: 0.5, prosodyScore: null },
        transcript: 'Hello world',
        words: [],
        alignment: [],
        source: 'fallback',
        phonemeSource: 'none',
      });
      mockPronunciationAi.generateFeedback.mockResolvedValue({
        feedback: 'Some feedback',
        phonemeHints: [],
      });

      const result = await svc.analyzePronunciation('base64', 'audio/webm', 'Hello world', 'English');

      expect(result.source).toBe('fallback');
    });
  });
});
