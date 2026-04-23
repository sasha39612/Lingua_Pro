import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { validateAudioBase64 } from './audio-validation';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeBase64(buf: Buffer): string {
  return buf.toString('base64');
}

// Minimal valid magic-byte headers for each container format.
function webmHeader(): Buffer {
  const buf = Buffer.alloc(16);
  buf[0] = 0x1a; buf[1] = 0x45; buf[2] = 0xdf; buf[3] = 0xa3;
  return buf;
}

function oggHeader(): Buffer {
  const buf = Buffer.alloc(16);
  buf[0] = 0x4f; buf[1] = 0x67; buf[2] = 0x67; buf[3] = 0x53; // OggS
  return buf;
}

function mp4Header(): Buffer {
  const buf = Buffer.alloc(16);
  // bytes 4-7 = 'ftyp'
  buf[4] = 0x66; buf[5] = 0x74; buf[6] = 0x79; buf[7] = 0x70;
  return buf;
}

function mp3IdHeader(): Buffer {
  // ID3 tag
  const buf = Buffer.alloc(16);
  buf[0] = 0x49; buf[1] = 0x44; buf[2] = 0x33;
  return buf;
}

function wavHeader(): Buffer {
  const buf = Buffer.alloc(16);
  buf[0] = 0x52; buf[1] = 0x49; buf[2] = 0x46; buf[3] = 0x46; // RIFF
  return buf;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('validateAudioBase64', () => {
  // ── Valid inputs ─────────────────────────────────────────────────────────────

  it('accepts a valid WebM payload', () => {
    const buf = validateAudioBase64(makeBase64(webmHeader()), 'audio/webm');
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf[0]).toBe(0x1a);
  });

  it('accepts a valid OGG payload', () => {
    const buf = validateAudioBase64(makeBase64(oggHeader()), 'audio/ogg');
    expect(buf).toBeInstanceOf(Buffer);
  });

  it('accepts a valid MP4/M4A payload for audio/mp4', () => {
    const buf = validateAudioBase64(makeBase64(mp4Header()), 'audio/mp4');
    expect(buf).toBeInstanceOf(Buffer);
  });

  it('accepts a valid MP4 payload for audio/x-m4a', () => {
    const buf = validateAudioBase64(makeBase64(mp4Header()), 'audio/x-m4a');
    expect(buf).toBeInstanceOf(Buffer);
  });

  it('accepts a valid MP3 payload (ID3 tag)', () => {
    const buf = validateAudioBase64(makeBase64(mp3IdHeader()), 'audio/mpeg');
    expect(buf).toBeInstanceOf(Buffer);
  });

  it('accepts a valid WAV payload', () => {
    const buf = validateAudioBase64(makeBase64(wavHeader()), 'audio/wav');
    expect(buf).toBeInstanceOf(Buffer);
  });

  it('accepts a data-URL prefixed payload', () => {
    const dataUrl = `data:audio/webm;base64,${makeBase64(webmHeader())}`;
    const buf = validateAudioBase64(dataUrl, 'audio/webm');
    expect(buf).toBeInstanceOf(Buffer);
  });

  // ── MIME type validation ─────────────────────────────────────────────────────

  it('rejects an unsupported MIME type', () => {
    expect(() => validateAudioBase64(makeBase64(webmHeader()), 'video/mp4'))
      .toThrow(BadRequestException);
  });

  it('rejects an empty MIME type', () => {
    expect(() => validateAudioBase64(makeBase64(webmHeader()), ''))
      .toThrow(BadRequestException);
  });

  it('is case-insensitive for MIME type', () => {
    // 'Audio/WebM' should be normalised to 'audio/webm'
    const buf = validateAudioBase64(makeBase64(webmHeader()), 'Audio/WebM');
    expect(buf).toBeInstanceOf(Buffer);
  });

  // ── Size validation ──────────────────────────────────────────────────────────

  it('rejects a base64 string longer than 14 MB characters', () => {
    // Generate a string of 14_000_001 'A' characters (invalid base64 but long enough to trip the check)
    const oversized = 'A'.repeat(14_000_001);
    expect(() => validateAudioBase64(oversized, 'audio/webm'))
      .toThrow(BadRequestException);
  });

  it('rejects an empty payload', () => {
    expect(() => validateAudioBase64('', 'audio/webm'))
      .toThrow(BadRequestException);
  });

  // ── Magic byte validation ────────────────────────────────────────────────────

  it('rejects a payload whose magic bytes do not match the declared MIME type', () => {
    // OGG bytes declared as WebM
    expect(() => validateAudioBase64(makeBase64(oggHeader()), 'audio/webm'))
      .toThrow(BadRequestException);
  });

  it('rejects a WAV payload declared as OGG', () => {
    expect(() => validateAudioBase64(makeBase64(wavHeader()), 'audio/ogg'))
      .toThrow(BadRequestException);
  });

  it('rejects zeroed bytes declared as WAV', () => {
    const zeros = Buffer.alloc(16);
    expect(() => validateAudioBase64(makeBase64(zeros), 'audio/wav'))
      .toThrow(BadRequestException);
  });
});
