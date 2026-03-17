import { vi } from 'vitest';

vi.mock('@nestjs/common', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    Logger: vi.fn(function () {
      return { warn: vi.fn(), log: vi.fn(), error: vi.fn() };
    }),
  };
});

function makeService() {
  const orig = process.env.AI_API_KEY;
  delete process.env.AI_API_KEY;
  const { TtsService } = require('./tts.service');
  const svc = new TtsService();
  if (orig !== undefined) process.env.AI_API_KEY = orig;
  return svc;
}

describe('TtsService — no AI_API_KEY', () => {
  it('returns null result without throwing', async () => {
    const svc = makeService();
    const result = await svc.synthesize('Hello world', 'English');
    expect(result.audioBase64).toBeNull();
    expect(result.mimeType).toBeNull();
    expect(result.durationEstimateMs).toBeNull();
  });

  it('returns null result for empty text', async () => {
    const svc = makeService();
    const result = await svc.synthesize('', 'English');
    expect(result.audioBase64).toBeNull();
  });
});

describe('TtsService — with mocked OpenAI', () => {
  afterEach(() => {
    vi.doUnmock('openai');
    delete process.env.AI_API_KEY;
  });

  it('returns base64 audioBase64 and audio/mpeg mimeType', async () => {
    const fakeBuffer = Buffer.from('fake mp3 bytes');
    vi.doMock('openai', () => ({
      default: vi.fn().mockImplementation(() => ({
        audio: {
          speech: {
            create: vi.fn().mockResolvedValue({
              arrayBuffer: async () => fakeBuffer.buffer,
            }),
          },
        },
      })),
    }));
    process.env.AI_API_KEY = 'test-key';

    const { TtsService: Fresh } = await import('./tts.service');
    const svc = new Fresh();
    const result = await svc.synthesize('Hello world', 'English');

    expect(typeof result.audioBase64).toBe('string');
    expect(result.audioBase64!.length).toBeGreaterThan(0);
    expect(result.mimeType).toBe('audio/mpeg');
  });

  it('duration estimate: 5-word text is ~2000ms', async () => {
    const fakeBuffer = Buffer.from('x');
    vi.doMock('openai', () => ({
      default: vi.fn().mockImplementation(() => ({
        audio: {
          speech: {
            create: vi.fn().mockResolvedValue({
              arrayBuffer: async () => fakeBuffer.buffer,
            }),
          },
        },
      })),
    }));
    process.env.AI_API_KEY = 'test-key';

    const { TtsService: Fresh } = await import('./tts.service');
    const svc = new Fresh();
    const result = await svc.synthesize('one two three four five', 'English');

    // 5 words / 2.5 words per second = 2000ms
    expect(result.durationEstimateMs).toBe(2000);
  });

  it('returns null result when OpenAI throws — does not propagate error', async () => {
    vi.doMock('openai', () => ({
      default: vi.fn().mockImplementation(() => ({
        audio: {
          speech: {
            create: vi.fn().mockRejectedValue(new Error('TTS unavailable')),
          },
        },
      })),
    }));
    process.env.AI_API_KEY = 'test-key';

    const { TtsService: Fresh } = await import('./tts.service');
    const svc = new Fresh();
    const result = await svc.synthesize('Hello', 'English');

    expect(result.audioBase64).toBeNull();
  });
});
