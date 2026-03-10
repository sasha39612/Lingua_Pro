import { vi } from 'vitest';
import { of } from 'rxjs';
import { OrchestratorController } from './orchestrator.controller';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeController() {
  const mockService = {
    analyzeText: vi.fn(),
    generateTasks: vi.fn(),
    transcribeAudio: vi.fn(),
    evaluatePronunciation: vi.fn(),
    streamTextAnalysis: vi.fn(),
  };
  const controller = new OrchestratorController(mockService as any);
  return { controller, mockService };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OrchestratorController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── POST /text/analyze ────────────────────────────────────────────────────

  describe('analyzeText', () => {
    it('delegates to service and returns result', async () => {
      const { controller, mockService } = makeController();
      const expected = { correctedText: 'Hello.', feedback: 'Good', textScore: 0.9 };
      mockService.analyzeText.mockResolvedValue(expected);

      const result = await controller.analyzeText({ text: 'Hello', language: 'English' });

      expect(mockService.analyzeText).toHaveBeenCalledWith('Hello', 'English');
      expect(result).toEqual(expected);
    });

    it('propagates service errors', async () => {
      const { controller, mockService } = makeController();
      mockService.analyzeText.mockRejectedValue(new Error('OpenAI down'));

      await expect(controller.analyzeText({ text: 'Hello', language: 'English' })).rejects.toThrow('OpenAI down');
    });
  });

  // ─── POST /tasks/generate ──────────────────────────────────────────────────

  describe('generateTasks', () => {
    it('wraps service result in { tasks } and returns', async () => {
      const { controller, mockService } = makeController();
      const tasks = [{ id: 1, prompt: 'Read this text' }];
      mockService.generateTasks.mockResolvedValue(tasks);

      const result = await controller.generateTasks({ language: 'English', level: 'A1' });

      expect(mockService.generateTasks).toHaveBeenCalledWith('English', 'A1', undefined);
      expect(result).toEqual({ tasks });
    });

    it('passes optional skill to service', async () => {
      const { controller, mockService } = makeController();
      mockService.generateTasks.mockResolvedValue([]);

      await controller.generateTasks({ language: 'German', level: 'B1', skill: 'writing' });

      expect(mockService.generateTasks).toHaveBeenCalledWith('German', 'B1', 'writing');
    });
  });

  // ─── POST /audio/transcribe ────────────────────────────────────────────────

  describe('transcribeAudio', () => {
    it('calls service with correct params and returns transcript', async () => {
      const { controller, mockService } = makeController();
      const transcription = { transcript: 'Hello world', language: 'English', confidence: 0.95 };
      mockService.transcribeAudio.mockResolvedValue(transcription);

      const result = await controller.transcribeAudio({
        audioBase64: 'base64data',
        mimeType: 'audio/mp3',
        language: 'English',
      });

      expect(mockService.transcribeAudio).toHaveBeenCalledWith('base64data', 'audio/mp3', 'English');
      expect(result).toEqual(transcription);
    });

    it('defaults mimeType to audio/webm when not provided', async () => {
      const { controller, mockService } = makeController();
      mockService.transcribeAudio.mockResolvedValue({});

      await controller.transcribeAudio({ audioBase64: 'data' });

      expect(mockService.transcribeAudio).toHaveBeenCalledWith('data', 'audio/webm', 'English');
    });

    it('defaults language to English when not provided', async () => {
      const { controller, mockService } = makeController();
      mockService.transcribeAudio.mockResolvedValue({});

      await controller.transcribeAudio({ audioBase64: 'data', mimeType: 'audio/mp3' });

      expect(mockService.transcribeAudio).toHaveBeenCalledWith('data', 'audio/mp3', 'English');
    });
  });

  // ─── POST /audio/pronunciation/evaluate ───────────────────────────────────

  describe('evaluatePronunciation', () => {
    it('calls service with correct params', async () => {
      const { controller, mockService } = makeController();
      const evalResult = { pronunciationScore: 0.88, feedback: 'Good', phonemeHints: [], transcript: 'hi' };
      mockService.evaluatePronunciation.mockResolvedValue(evalResult);

      const result = await controller.evaluatePronunciation({
        referenceText: 'Hello world',
        language: 'English',
        transcript: 'Hello world',
        audioBase64: 'base64',
        mimeType: 'audio/mp3',
      });

      expect(mockService.evaluatePronunciation).toHaveBeenCalledWith(
        'Hello world',
        'English',
        'base64',
        'Hello world',
        'audio/mp3',
      );
      expect(result).toEqual(evalResult);
    });

    it('defaults mimeType to audio/webm', async () => {
      const { controller, mockService } = makeController();
      mockService.evaluatePronunciation.mockResolvedValue({});

      await controller.evaluatePronunciation({ referenceText: 'Hi', language: 'English' });

      expect(mockService.evaluatePronunciation).toHaveBeenCalledWith(
        'Hi', 'English', undefined, undefined, 'audio/webm',
      );
    });
  });

  // ─── GET /text/analyze/stream (SSE) ───────────────────────────────────────

  describe('streamTextAnalyze', () => {
    it('returns observable from service', () => {
      const { controller, mockService } = makeController();
      const fakeObservable = of({ data: 'chunk1' });
      mockService.streamTextAnalysis.mockReturnValue(fakeObservable);

      const result = controller.streamTextAnalyze('Hello', 'English');

      expect(mockService.streamTextAnalysis).toHaveBeenCalledWith('Hello', 'English');
      expect(result).toBe(fakeObservable);
    });

    it('defaults text to empty string and language to English', () => {
      const { controller, mockService } = makeController();
      mockService.streamTextAnalysis.mockReturnValue(of());

      controller.streamTextAnalyze();

      expect(mockService.streamTextAnalysis).toHaveBeenCalledWith('', 'English');
    });
  });
});
