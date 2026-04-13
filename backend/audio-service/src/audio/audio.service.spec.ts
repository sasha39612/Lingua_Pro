import { vi, type Mocked } from 'vitest';
import { AudioService } from './audio.service';

const mockAudioRepository = {
  createAudioRecord: vi.fn(),
  getAudioRecordsByUserId: vi.fn(),
  getAudioRecord: vi.fn(),
  getUserAudioStats: vi.fn(),
  getListeningTasks: vi.fn(),
  getRecordsByLanguage: vi.fn(),
  getListeningScoresByLanguage: vi.fn(),
  getTaskById: vi.fn(),
  getNextListeningTask: vi.fn(),
  createTask: vi.fn(),
  upsertListeningScore: vi.fn(),
  updateTaskAudio: vi.fn(),
};

const mockAiOrchestrator = {
  analyzeAudio: vi.fn(),
  generateTask: vi.fn(),
  generateListeningPassage: vi.fn(),
  generateListeningExercise: vi.fn(),
  synthesizeSpeech: vi.fn(),
};

vi.mock('axios');
import axios from 'axios';
const mockedAxios = axios as Mocked<typeof axios>;

describe('AudioService', () => {
  let service: AudioService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AudioService(mockAudioRepository as any, mockAiOrchestrator as any);
  });

  // ─── evaluateComprehension ───────────────────────────────────────────────────

  describe('evaluateComprehension', () => {
    it('returns correct=true when answers match (case-insensitive, trimmed)', async () => {
      const result = await service.evaluateComprehension('  Hello  ', 'hello');
      expect(result).toEqual({
        isCorrect: true,
        score: 1,
        feedback: 'Correct answer. Good listening comprehension.',
      });
    });

    it('returns correct=false when answers differ', async () => {
      const result = await service.evaluateComprehension('world', 'hello');
      expect(result).toEqual({
        isCorrect: false,
        score: 0,
        feedback: 'Incorrect answer. Replay the audio and try again.',
      });
    });

    it('returns error response when correctAnswer is empty', async () => {
      const result = await service.evaluateComprehension('anything', '');
      expect(result).toEqual({
        isCorrect: false,
        score: 0,
        feedback: 'Correct answer is missing for this task.',
      });
    });

    it('handles empty userAnswer (treated as wrong)', async () => {
      const result = await service.evaluateComprehension('', 'expected');
      expect(result.isCorrect).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  // ─── processAudio ────────────────────────────────────────────────────────────

  describe('processAudio', () => {
    const fakeBuffer = Buffer.from('fake-audio-data');
    const fakeRecord = {
      id: 1,
      userId: 42,
      language: 'english',
      transcript: 'Hello world',
      pronunciationScore: 0.88,
      feedback: 'Good pronunciation overall.',
      audioUrl: 'https://example.com/audio.mp3',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };

    beforeEach(() => {
      mockedAxios.get = vi.fn().mockResolvedValue({ data: fakeBuffer });
      mockAiOrchestrator.analyzeAudio.mockResolvedValue({
        transcript: 'Hello world',
        pronunciationScore: 0.88,
        feedback: 'Good pronunciation overall.',
        phonemeHints: ['Focus on vowel clarity'],
        confidence: 0.95,
      });
      mockAudioRepository.createAudioRecord.mockResolvedValue(fakeRecord);
    });

    it('downloads audio, calls orchestrator, saves record, returns result', async () => {
      const result = await service.processAudio('42', 'english', 'https://example.com/audio.mp3');

      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com/audio.mp3', { responseType: 'arraybuffer' });
      expect(mockAiOrchestrator.analyzeAudio).toHaveBeenCalledWith(
        expect.any(Buffer),
        'audio/wav',
        'english',
        undefined,
      );
      expect(mockAudioRepository.createAudioRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 42,
          language: 'english',
          transcript: 'Hello world',
          pronunciationScore: 0.88,
          audioUrl: 'https://example.com/audio.mp3',
        }),
      );

      expect(result).toMatchObject({
        id: 1,
        userId: 42,
        language: 'english',
        transcript: 'Hello world',
        pronunciationScore: 0.88,
        confidence: 0.95,
        phonemeHints: ['Focus on vowel clarity'],
      });
    });

    it('passes expectedText to analyzeAudio when provided', async () => {
      await service.processAudio('42', 'english', 'https://example.com/audio.mp3', 'Hello world');
      expect(mockAiOrchestrator.analyzeAudio).toHaveBeenCalledWith(
        expect.any(Buffer),
        'audio/wav',
        'english',
        'Hello world',
      );
    });

    it('propagates error from AI orchestrator', async () => {
      mockAiOrchestrator.analyzeAudio.mockRejectedValue(new Error('Orchestrator timeout'));
      await expect(service.processAudio('42', 'english', 'https://example.com/audio.mp3')).rejects.toThrow('Orchestrator timeout');
    });
  });

  // ─── getAudioRecords ─────────────────────────────────────────────────────────

  describe('getAudioRecords', () => {
    it('delegates to repository with parsed userId', async () => {
      mockAudioRepository.getAudioRecordsByUserId.mockResolvedValue([{ id: 1 }]);
      const result = await service.getAudioRecords('7');
      expect(mockAudioRepository.getAudioRecordsByUserId).toHaveBeenCalledWith(7);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  // ─── getRecordsByLanguage ─────────────────────────────────────────────────────

  describe('getRecordsByLanguage', () => {
    it('delegates with language and optional from param', async () => {
      mockAudioRepository.getRecordsByLanguage.mockResolvedValue({ records: [] });
      await service.getRecordsByLanguage('english', '2026-01-01');
      expect(mockAudioRepository.getRecordsByLanguage).toHaveBeenCalledWith('english', '2026-01-01');
    });

    it('delegates without from param when not provided', async () => {
      mockAudioRepository.getRecordsByLanguage.mockResolvedValue({ records: [] });
      await service.getRecordsByLanguage('german');
      expect(mockAudioRepository.getRecordsByLanguage).toHaveBeenCalledWith('german', undefined);
    });
  });

  // ─── generateComprehension ───────────────────────────────────────────────────

  describe('generateComprehension', () => {
    it('returns task data when found', async () => {
      const fakeTask = {
        id: 5,
        prompt: 'What is the capital of Germany?',
        answerOptions: ['Berlin', 'Munich', 'Hamburg'],
        correctAnswer: 'Berlin',
      };
      mockAudioRepository.getTaskById.mockResolvedValue(fakeTask);
      // Simulate DATABASE_URL being set
      const origEnv = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = await service.generateComprehension('5');
      expect(result).toEqual({
        taskId: 5,
        prompt: 'What is the capital of Germany?',
        answerOptions: ['Berlin', 'Munich', 'Hamburg'],
        correctAnswer: 'Berlin',
      });

      process.env.DATABASE_URL = origEnv;
    });

    it('returns fallback when DATABASE_URL is not set', async () => {
      const origEnv = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      const result = await service.generateComprehension('5');
      expect(result).toMatchObject({
        taskId: 5,
        prompt: expect.stringContaining('unavailable'),
        answerOptions: [],
        correctAnswer: null,
      });

      process.env.DATABASE_URL = origEnv;
    });

    it('throws when task is not found', async () => {
      mockAudioRepository.getTaskById.mockResolvedValue(null);
      const origEnv = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      await expect(service.generateComprehension('999')).rejects.toThrow('Listening task not found');

      process.env.DATABASE_URL = origEnv;
    });
  });

  // ─── getListeningTask ────────────────────────────────────────────────────────

  describe('getListeningTask', () => {
    // v2 passage — 8 questions in new CEFR-graded format
    const fakePassageV2 = {
      passageText: 'The speaker talks about travel.',
      questions: [
        { type: 'multiple_choice', difficulty: 'B1', points: 1, question: 'Q1?', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
        { type: 'multiple_choice', difficulty: 'B1', points: 1, question: 'Q2?', options: ['A', 'B', 'C', 'D'], correctAnswer: 1 },
        { type: 'true_false_ng', difficulty: 'B2', points: 2, question: 'Q3?', correctAnswer: 'T' },
        { type: 'true_false_ng', difficulty: 'B2', points: 2, question: 'Q4?', correctAnswer: 'F' },
        { type: 'short_answer', difficulty: 'C1', points: 3, question: 'Q5?', correctAnswer: 'travel' },
        { type: 'short_answer', difficulty: 'C1', points: 3, question: 'Q6?', correctAnswer: 'commute' },
        { type: 'paraphrase', difficulty: 'C2', points: 4, question: 'Q7?', options: ['A', 'B', 'C', 'D'], correctAnswer: 2 },
        { type: 'paraphrase', difficulty: 'C2', points: 4, question: 'Q8?', options: ['A', 'B', 'C', 'D'], correctAnswer: 3 },
      ],
    };
    const fakeQuestionsJson = JSON.stringify(fakePassageV2.questions);

    const fakeTaskWithAudio = {
      id: 10,
      language: 'english',
      level: 'B1',
      skill: 'listening',
      prompt: 'Listen to the audio and answer the comprehension questions.',
      audioUrl: 'data:audio/mpeg;base64,AAAA',
      referenceText: 'The speaker talks about travel.',
      answerOptions: [] as string[],
      correctAnswer: null,
      questionsJson: fakeQuestionsJson,
      createdAt: new Date(),
    };

    const fakeTaskNoAudio = { ...fakeTaskWithAudio, id: 11, audioUrl: null };

    const fakeTts = { audioBase64: 'BASE64DATA', mimeType: 'audio/mpeg', durationEstimateMs: 3000 };

    beforeEach(() => {
      mockAudioRepository.getNextListeningTask.mockResolvedValue(null);
      mockAudioRepository.createTask.mockResolvedValue(fakeTaskWithAudio);
      mockAudioRepository.updateTaskAudio.mockResolvedValue(undefined);
      mockAiOrchestrator.generateListeningExercise.mockResolvedValue(fakePassageV2);
      mockAiOrchestrator.synthesizeSpeech.mockResolvedValue(fakeTts);
    });

    it('returns existing task directly when it has audioUrl and questionsJson', async () => {
      mockAudioRepository.getNextListeningTask.mockResolvedValue(fakeTaskWithAudio);

      const result = await service.getListeningTask('42', 'english', 'B1');

      expect(mockAudioRepository.getNextListeningTask).toHaveBeenCalledWith(42, 'english', 'B1');
      expect(mockAiOrchestrator.generateListeningExercise).not.toHaveBeenCalled();
      expect(result.taskId).toBe(10);
      expect(result.audioUrl).toBe('data:audio/mpeg;base64,AAAA');
      expect(result.audioBase64).toBe('AAAA');
      expect(result.questions).toHaveLength(8);
      expect(result.questions[0]).toMatchObject({ index: 0, question: 'Q1?' });
    });

    it('strips correctAnswer from questions returned to client', async () => {
      mockAudioRepository.getNextListeningTask.mockResolvedValue(fakeTaskWithAudio);

      const result = await service.getListeningTask('42', 'english', 'B1');

      result.questions.forEach((q) => {
        expect(q).not.toHaveProperty('correctAnswer');
      });
    });

    it('synthesizes audio and backfills when existing task has no audioUrl', async () => {
      mockAudioRepository.getNextListeningTask.mockResolvedValue(fakeTaskNoAudio);

      const result = await service.getListeningTask('42', 'english', 'B1');

      expect(mockAiOrchestrator.synthesizeSpeech).toHaveBeenCalledWith(
        fakeTaskNoAudio.referenceText,
        'english',
      );
      expect(mockAudioRepository.updateTaskAudio).toHaveBeenCalledWith(
        11,
        'data:audio/mpeg;base64,BASE64DATA',
      );
      expect(result.taskId).toBe(11);
      expect(result.audioBase64).toBe('BASE64DATA');
      expect(result.durationEstimateMs).toBe(3000);
    });

    it('returns task without audio when existing task has no audioUrl and TTS fails', async () => {
      mockAudioRepository.getNextListeningTask.mockResolvedValue(fakeTaskNoAudio);
      mockAiOrchestrator.synthesizeSpeech.mockResolvedValue({ audioBase64: null, mimeType: null, durationEstimateMs: null });

      const result = await service.getListeningTask('42', 'english', 'B1');

      expect(result.taskId).toBe(11);
      expect(result.audioBase64).toBeNull();
      expect(result.audioUrl).toBeNull();
    });

    it('falls through to generation when existing task has no questionsJson', async () => {
      const taskWithoutQuestions = { ...fakeTaskWithAudio, questionsJson: null };
      mockAudioRepository.getNextListeningTask.mockResolvedValue(taskWithoutQuestions);

      await service.getListeningTask('42', 'english', 'B1');

      expect(mockAiOrchestrator.generateListeningExercise).toHaveBeenCalledWith('english', 'B1');
    });

    it('generates new exercise + TTS and saves when no existing task found', async () => {
      mockAudioRepository.getNextListeningTask.mockResolvedValue(null);
      // Return a task whose questionsJson contains the v2 questions so parseQuestionsForClient gets 8
      mockAudioRepository.createTask.mockResolvedValueOnce({
        ...fakeTaskWithAudio,
        audioUrl: 'data:audio/mpeg;base64,BASE64DATA',
        questionsJson: JSON.stringify(fakePassageV2.questions),
      });

      const result = await service.getListeningTask('42', 'english', 'B1');

      expect(mockAiOrchestrator.generateListeningExercise).toHaveBeenCalledWith('english', 'B1');
      expect(mockAiOrchestrator.synthesizeSpeech).toHaveBeenCalledWith(
        fakePassageV2.passageText,
        'english',
      );
      expect(mockAudioRepository.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'english',
          level: 'B1',
          skill: 'listening',
          audioUrl: 'data:audio/mpeg;base64,BASE64DATA',
          questionsJson: JSON.stringify(fakePassageV2.questions),
        }),
      );
      expect(result.taskId).toBe(fakeTaskWithAudio.id);
      expect(result.audioBase64).toBe('BASE64DATA');
      expect(result.questions).toHaveLength(8); // new v2 format
    });

    it('normalizes language to lowercase before querying', async () => {
      mockAudioRepository.getNextListeningTask.mockResolvedValue(null);

      await service.getListeningTask('42', 'English', 'B1');

      expect(mockAudioRepository.getNextListeningTask).toHaveBeenCalledWith(42, 'english', 'B1');
    });

    it('returns null audio when TTS fails during generation', async () => {
      mockAudioRepository.getNextListeningTask.mockResolvedValue(null);
      mockAiOrchestrator.synthesizeSpeech.mockResolvedValue({ audioBase64: null, mimeType: null, durationEstimateMs: null });

      const result = await service.getListeningTask('42', 'english', 'B1');

      expect(result.audioBase64).toBeNull();
      expect(result.audioUrl).toBeNull();
    });
  });

  // ─── submitListeningAnswers ──────────────────────────────────────────────────

  describe('submitListeningAnswers', () => {
    const fakeQuestions = [
      { question: 'Q1?', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
      { question: 'Q2?', options: ['A', 'B', 'C', 'D'], correctAnswer: 1 },
      { question: 'Q3?', options: ['A', 'B', 'C', 'D'], correctAnswer: 2 },
      { question: 'Q4?', options: ['A', 'B', 'C', 'D'], correctAnswer: 3 },
      { question: 'Q5?', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
    ];

    const fakeTask = {
      id: 10,
      prompt: 'Listen to the audio and answer the comprehension questions.',
      answerOptions: [] as string[],
      correctAnswer: null,
      questionsJson: JSON.stringify(fakeQuestions),
      language: 'english',
      level: 'B1',
      skill: 'listening',
      audioUrl: null,
      referenceText: null,
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockAudioRepository.getTaskById.mockResolvedValue(fakeTask);
      mockAudioRepository.upsertListeningScore.mockResolvedValue(undefined);
    });

    it('returns score=1 when all answers are correct', async () => {
      // correctAnswers: [0, 1, 2, 3, 0]
      const result = await service.submitListeningAnswers('42', 10, [0, 1, 2, 3, 0]);

      expect(result.score).toBe(1);
      expect(result.correct).toBe(5);
      expect(result.total).toBe(5);
      expect(mockAudioRepository.upsertListeningScore).toHaveBeenCalledWith(42, 10, 1);
    });

    it('returns partial score when some answers are wrong', async () => {
      // correct: [0,1,2,3,0] — user gives wrong answers for Q1 and Q5
      const result = await service.submitListeningAnswers('42', 10, [1, 1, 2, 3, 1]);

      expect(result.correct).toBe(3);
      expect(result.total).toBe(5);
      expect(result.score).toBeCloseTo(3 / 5);
    });

    it('returns score=0 when all answers are wrong', async () => {
      const result = await service.submitListeningAnswers('42', 10, [3, 0, 0, 0, 3]);

      expect(result.score).toBe(0);
      expect(result.correct).toBe(0);
    });

    it('returns per-question result with correctOptionText', async () => {
      const result = await service.submitListeningAnswers('42', 10, [0, 1, 2, 3, 0]);

      expect(result.results).toHaveLength(5);
      expect(result.results[0]).toMatchObject({
        questionIndex: 0,
        question: 'Q1?',
        correct: true,
        userAnswer: 0,
        correctAnswer: 0,
        correctOptionText: 'A',
      });
      expect(result.results[2]).toMatchObject({
        questionIndex: 2,
        correct: true,
        correctAnswer: 2,
        correctOptionText: 'C',
      });
    });

    it('marks incorrect questions properly in results', async () => {
      const result = await service.submitListeningAnswers('42', 10, [1, 1, 2, 3, 0]);

      expect(result.results[0].correct).toBe(false);
      expect(result.results[0].userAnswer).toBe(1);
      expect(result.results[0].correctAnswer).toBe(0);
    });

    it('throws when task is not found', async () => {
      mockAudioRepository.getTaskById.mockResolvedValue(null);

      await expect(service.submitListeningAnswers('42', 999, [0, 1, 2, 3, 0])).rejects.toThrow('999');
    });

    it('throws when task has no questionsJson', async () => {
      mockAudioRepository.getTaskById.mockResolvedValue({ ...fakeTask, questionsJson: null });

      await expect(service.submitListeningAnswers('42', 10, [0, 1, 2, 3, 0])).rejects.toThrow('Task has no questions');
    });

    it('persists score with parsed integer userId', async () => {
      await service.submitListeningAnswers('7', 10, [0, 1, 2, 3, 0]);
      expect(mockAudioRepository.upsertListeningScore).toHaveBeenCalledWith(7, 10, expect.any(Number));
    });

    // ── v2 (CEFR-graded) format ──────────────────────────────────────────────

    describe('v2 format — weighted scoring and level-relative CEFR result', () => {
      // B2 task: 4×B1(1pt) + 4×B2(2pts) = 12 pts max
      const b2Questions = [
        { type: 'multiple_choice', difficulty: 'B1', points: 1, question: 'Q1?', options: ['A','B','C','D'], correctAnswer: 0 },
        { type: 'multiple_choice', difficulty: 'B1', points: 1, question: 'Q2?', options: ['A','B','C','D'], correctAnswer: 1 },
        { type: 'multiple_choice', difficulty: 'B1', points: 1, question: 'Q3?', options: ['A','B','C','D'], correctAnswer: 2 },
        { type: 'multiple_choice', difficulty: 'B1', points: 1, question: 'Q4?', options: ['A','B','C','D'], correctAnswer: 3 },
        { type: 'true_false_ng',   difficulty: 'B2', points: 2, question: 'Q5?', correctAnswer: 'T' },
        { type: 'true_false_ng',   difficulty: 'B2', points: 2, question: 'Q6?', correctAnswer: 'F' },
        { type: 'true_false_ng',   difficulty: 'B2', points: 2, question: 'Q7?', correctAnswer: 'NG' },
        { type: 'true_false_ng',   difficulty: 'B2', points: 2, question: 'Q8?', correctAnswer: 'T' },
      ];
      const fakeB2Task = {
        id: 20,
        prompt: 'Listen.',
        answerOptions: [] as string[],
        correctAnswer: null,
        questionsJson: JSON.stringify(b2Questions),
        language: 'english',
        level: 'B2',
        skill: 'listening',
        audioUrl: null,
        referenceText: null,
        createdAt: new Date(),
      };

      beforeEach(() => {
        mockAudioRepository.getTaskById.mockResolvedValue(fakeB2Task);
      });

      it('computes maxRawScore dynamically (B2 task = 12)', async () => {
        const result = await service.submitListeningAnswers('42', 20, [0, 1, 2, 3, 'T', 'F', 'NG', 'T']);
        expect(result.maxRawScore).toBe(12);
        expect(result.rawScore).toBe(12);
        expect(result.score).toBeCloseTo(1);
      });

      it('cefrLevel = B2 when score >= 90% of B2 task', async () => {
        // All correct → 12/12 = 100% → B2
        const result = await service.submitListeningAnswers('42', 20, [0, 1, 2, 3, 'T', 'F', 'NG', 'T']);
        expect(result.cefrLevel).toBe('B2');
      });

      it('cefrLevel = B1 when score 60-89% of B2 task', async () => {
        // Get 8/12 ≈ 67% → one below B2 = B1
        const result = await service.submitListeningAnswers('42', 20, [0, 1, 2, 3, 'T', 'F', 'T', 'F']);
        // Q7 wrong (NG vs T), Q8 wrong (T vs F) → 4×1 + 2×2 = 8pts
        expect(result.rawScore).toBe(8);
        expect(result.cefrLevel).toBe('B1');
      });

      it('cefrLevel = B1 (floor) when score < 60% of B2 task', async () => {
        // Get 4/12 ≈ 33% → two below B2 = B1 (floor at index 0)
        const result = await service.submitListeningAnswers('42', 20, [0, 1, 2, 3, 'F', 'T', 'T', 'F']);
        // All B2 wrong → 4pts → 33%
        expect(result.rawScore).toBe(4);
        expect(result.cefrLevel).toBe('B1');
      });

      it('cefrLevel = C1 when score 60-89% of C2 task', async () => {
        // C2 task uses fakePassageV2 from getListeningTask tests: max 20pts
        const c2Questions = [
          { type: 'multiple_choice', difficulty: 'B1', points: 1, question: 'Q1?', options: ['A','B','C','D'], correctAnswer: 0 },
          { type: 'multiple_choice', difficulty: 'B1', points: 1, question: 'Q2?', options: ['A','B','C','D'], correctAnswer: 1 },
          { type: 'true_false_ng',   difficulty: 'B2', points: 2, question: 'Q3?', correctAnswer: 'T' },
          { type: 'true_false_ng',   difficulty: 'B2', points: 2, question: 'Q4?', correctAnswer: 'F' },
          { type: 'short_answer',    difficulty: 'C1', points: 3, question: 'Q5?', correctAnswer: 'travel' },
          { type: 'short_answer',    difficulty: 'C1', points: 3, question: 'Q6?', correctAnswer: 'commute' },
          { type: 'paraphrase',      difficulty: 'C2', points: 4, question: 'Q7?', options: ['A','B','C','D'], correctAnswer: 2 },
          { type: 'paraphrase',      difficulty: 'C2', points: 4, question: 'Q8?', options: ['A','B','C','D'], correctAnswer: 3 },
        ];
        mockAudioRepository.getTaskById.mockResolvedValue({
          ...fakeB2Task, id: 30, level: 'C2', questionsJson: JSON.stringify(c2Questions),
        });
        // Answer all B1+B2+C1 correct, C2 wrong: 1+1+2+2+3+3 = 12/20 = 60% → C1
        const result = await service.submitListeningAnswers('42', 30, [0, 1, 'T', 'F', 'travel', 'commute', 0, 0]);
        expect(result.rawScore).toBe(12);
        expect(result.maxRawScore).toBe(20);
        expect(result.cefrLevel).toBe('C1');
      });
    });
  });

  // ─── getListeningScoresByLanguage ──────────────────────────────────────────

  describe('getListeningScoresByLanguage', () => {
    it('returns scores wrapped in { scores }', async () => {
      const scores = [
        { score: 0.8, createdAt: new Date('2026-01-01') },
        { score: 0.9, createdAt: new Date('2026-01-02') },
      ];
      mockAudioRepository.getListeningScoresByLanguage.mockResolvedValue(scores);

      const result = await service.getListeningScoresByLanguage('english');

      expect(mockAudioRepository.getListeningScoresByLanguage).toHaveBeenCalledWith('english', undefined);
      expect(result).toEqual({ scores });
    });

    it('passes from param when provided', async () => {
      mockAudioRepository.getListeningScoresByLanguage.mockResolvedValue([]);

      await service.getListeningScoresByLanguage('german', '2026-01-01T00:00:00.000Z');

      expect(mockAudioRepository.getListeningScoresByLanguage).toHaveBeenCalledWith(
        'german',
        '2026-01-01T00:00:00.000Z',
      );
    });

    it('returns empty scores array when repository returns nothing', async () => {
      mockAudioRepository.getListeningScoresByLanguage.mockResolvedValue([]);

      const result = await service.getListeningScoresByLanguage('polish');
      expect(result).toEqual({ scores: [] });
    });
  });
});
