import { describe, it, expect, vi } from 'vitest';
import { computeWordAlignment } from './util';
import type { WordDetail } from './types';

// Minimal G2pService stub — disables G2P code path in tests (espeak-ng not available in CI)
const g2pStub = { isAvailable: () => false, wordToIpa: () => '', splitIpa: () => [], diffWords: () => ({ score: 1, errorPhonemes: [] }) };
const mockAiUsage = { log: vi.fn() } as any;

// ── computeWordAlignment (pure function — exhaustive tests) ───────────────────

function makeWord(word: string, errorType: WordDetail['errorType'] = 'None'): WordDetail {
  return { word, accuracyScore: errorType === 'None' ? 95 : 40, errorType, phonemes: [] };
}

describe('computeWordAlignment', () => {
  it('exact match → all correct', () => {
    const words = [makeWord('hello'), makeWord('world')];
    const alignment = computeWordAlignment('hello world', words);

    expect(alignment).toHaveLength(2);
    expect(alignment[0]).toMatchObject({ expected: 'hello', spoken: 'hello', type: 'correct' });
    expect(alignment[1]).toMatchObject({ expected: 'world', spoken: 'world', type: 'correct' });
  });

  it('Azure errorType Mispronunciation on matched token → mispronounced', () => {
    const words = [makeWord('hello', 'Mispronunciation'), makeWord('world')];
    const alignment = computeWordAlignment('hello world', words);

    expect(alignment[0].type).toBe('mispronounced');
    expect(alignment[1].type).toBe('correct');
  });

  it('one word missing from spoken → missing entry', () => {
    const words = [makeWord('world')];
    const alignment = computeWordAlignment('hello world', words);

    const missing = alignment.find((a) => a.type === 'missing');
    expect(missing).toBeDefined();
    expect(missing!.expected).toBe('hello');
    expect(missing!.spoken).toBeNull();
  });

  it('one extra word spoken → extra entry', () => {
    const words = [makeWord('hello'), makeWord('beautiful'), makeWord('world')];
    const alignment = computeWordAlignment('hello world', words);

    const extra = alignment.find((a) => a.type === 'extra');
    expect(extra).toBeDefined();
  });

  it('substitution → mispronounced with expected/spoken set', () => {
    const words = [makeWord('helo'), makeWord('world')];
    const alignment = computeWordAlignment('hello world', words);

    const sub = alignment.find((a) => a.type === 'mispronounced');
    expect(sub).toBeDefined();
    expect(sub!.expected).toBe('hello');
    expect(sub!.spoken).toBe('helo');
  });

  it('empty words → all reference tokens become missing', () => {
    const alignment = computeWordAlignment('hello world', []);

    expect(alignment).toHaveLength(2);
    expect(alignment.every((a) => a.type === 'missing')).toBe(true);
    expect(alignment.every((a) => a.spoken === null)).toBe(true);
  });

  it('empty referenceText → all spoken tokens become extra', () => {
    const words = [makeWord('hello'), makeWord('world')];
    const alignment = computeWordAlignment('', words);

    expect(alignment).toHaveLength(2);
    expect(alignment.every((a) => a.type === 'extra')).toBe(true);
  });

  it('both empty → empty alignment', () => {
    const alignment = computeWordAlignment('', []);
    expect(alignment).toHaveLength(0);
  });

  it('strips punctuation from reference before comparison', () => {
    const words = [makeWord('hello'), makeWord('world')];
    const alignment = computeWordAlignment('hello, world!', words);

    expect(alignment.every((a) => a.type === 'correct')).toBe(true);
  });

  it('attaches wordDetail to aligned words', () => {
    const wd = makeWord('hello');
    const alignment = computeWordAlignment('hello', [wd]);

    expect(alignment[0].wordDetail).toBe(wd);
  });

  it('missing words have no wordDetail', () => {
    const alignment = computeWordAlignment('hello world', [makeWord('hello')]);
    const missing = alignment.find((a) => a.type === 'missing');
    expect(missing?.wordDetail).toBeUndefined();
  });
});

// ── SpeechService fallback chain ───────────────────────────────────────────────

describe('SpeechService — fallback when no keys', () => {
  beforeEach(() => {
    vi.doUnmock('microsoft-cognitiveservices-speech-sdk');
  });

  afterEach(() => {
    delete process.env.AI_API_KEY;
    delete process.env.AZURE_SPEECH_KEY;
    delete process.env.AZURE_SPEECH_REGION;
    vi.doUnmock('openai');
  });

  it('returns source:fallback for empty base64 with no keys', async () => {
    vi.mock('@nestjs/common', async (importOriginal) => {
      const actual = (await importOriginal()) as any;
      return { ...actual, Logger: vi.fn(() => ({ warn: vi.fn(), log: vi.fn(), error: vi.fn() })) };
    });

    const { SpeechService } = await import('./speech.service');
    const svc = new SpeechService(g2pStub as any, mockAiUsage);
    const result = await svc.transcribe('', 'audio/webm', 'English');

    expect(result.source).toBe('fallback');
    expect(result.words).toEqual([]);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('returns source:fallback for invalid base64 with no keys', async () => {
    const { SpeechService } = await import('./speech.service');
    const svc = new SpeechService(g2pStub as any, mockAiUsage);
    const result = await svc.transcribe('not-base64!!!', 'audio/webm', 'German');

    expect(result.source).toBe('fallback');
    expect(result.language).toBe('German');
  });

  it('pronunciation fallback returns all four scores as equal numbers', async () => {
    const { SpeechService } = await import('./speech.service');
    const svc = new SpeechService(g2pStub as any, mockAiUsage);
    const result = await svc.analyzePronunciation('', 'audio/webm', 'Hello world', 'English');

    expect(result.source).toBe('fallback');
    expect(result.scores.pronunciationScore).toBeGreaterThanOrEqual(0);
    expect(result.scores.pronunciationScore).toBeLessThanOrEqual(1);
    expect(result.alignment).toBeDefined();
  });
});
