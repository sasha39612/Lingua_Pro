import { vi } from 'vitest';
import { TtsService } from './tts.service';

vi.mock('@nestjs/common', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    Logger: vi.fn(function () {
      return { warn: vi.fn(), log: vi.fn(), error: vi.fn() };
    }),
  };
});

// Prevent Prisma WASM from loading in tests — AiUsageService is imported by
// tts.service.ts only for Nest's design:paramtypes DI metadata; tests pass a
// mock instance directly to the constructor and never touch the real class.
vi.mock('./usage/ai-usage.service', () => ({
  AiUsageService: class { log = vi.fn(); },
}));

// Hoisted, file-scoped mock — registered once, so there's no per-test
// resetModules()/doMock() race that could let a real `openai` import (and a
// real network call) slip through under load.
const mockCreate = vi.fn();
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    audio: { speech: { create: mockCreate } },
  })),
}));

const mockAiUsage = { log: vi.fn() } as any;

describe('TtsService — no AI_API_KEY', () => {
  beforeEach(() => {
    delete process.env.AI_API_KEY;
  });

  it('returns null result without throwing', async () => {
    const svc = new TtsService(mockAiUsage);
    const result = await svc.synthesize('Hello world', 'English');
    expect(result.audioBase64).toBeNull();
    expect(result.mimeType).toBeNull();
    expect(result.durationEstimateMs).toBeNull();
  });

  it('returns null result for empty text', async () => {
    const svc = new TtsService(mockAiUsage);
    const result = await svc.synthesize('', 'English');
    expect(result.audioBase64).toBeNull();
  });
});

describe('TtsService — with mocked OpenAI', () => {
  beforeEach(() => {
    process.env.AI_API_KEY = 'test-key';
    mockCreate.mockReset();
  });

  afterEach(() => {
    delete process.env.AI_API_KEY;
  });

  it('returns base64 audioBase64 and audio/mpeg mimeType', async () => {
    const fakeBuffer = Buffer.from('fake mp3 bytes');
    mockCreate.mockResolvedValue({ arrayBuffer: async () => fakeBuffer.buffer });

    const svc = new TtsService(mockAiUsage);
    const result = await svc.synthesize('Hello world', 'English');

    expect(typeof result.audioBase64).toBe('string');
    expect(result.audioBase64!.length).toBeGreaterThan(0);
    expect(result.mimeType).toBe('audio/mpeg');
  });

  it('duration estimate: 5-word text is ~2000ms', async () => {
    const fakeBuffer = Buffer.from('x');
    mockCreate.mockResolvedValue({ arrayBuffer: async () => fakeBuffer.buffer });

    const svc = new TtsService(mockAiUsage);
    const result = await svc.synthesize('one two three four five', 'English');

    // 5 words / 2.5 words per second = 2000ms
    expect(result.durationEstimateMs).toBe(2000);
  });

  it('returns null result when OpenAI throws — does not propagate error', async () => {
    mockCreate.mockRejectedValue(new Error('TTS unavailable'));

    const svc = new TtsService(mockAiUsage);
    const result = await svc.synthesize('Hello', 'English');

    expect(result.audioBase64).toBeNull();
  });
});
