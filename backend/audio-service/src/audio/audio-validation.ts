import { BadRequestException } from '@nestjs/common';

// ~10 MB decoded; base64 encodes at ~1.33× so the base64 string can be up to ~14 MB chars
const MAX_BASE64_CHARS = 14_000_000;
const MAX_DECODED_BYTES = 10_485_760; // 10 MiB

const ALLOWED_MIME_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/x-m4a',
]);

// Magic byte signatures for supported audio container formats.
// Each entry is a list of byte sequences that can appear at offset 0.
const MAGIC_BYTES: Array<{ mimes: string[]; check: (b: Buffer) => boolean }> = [
  {
    mimes: ['audio/webm'],
    // EBML header: 0x1A 0x45 0xDF 0xA3
    check: (b) => b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
  },
  {
    mimes: ['audio/ogg'],
    // OGG capture pattern: 'OggS'
    check: (b) => b.length >= 4 && b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53,
  },
  {
    mimes: ['audio/mp4', 'audio/x-m4a'],
    // ISO Base Media / MP4: bytes 4–7 are 'ftyp'
    check: (b) =>
      b.length >= 8 &&
      b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70,
  },
  {
    mimes: ['audio/mpeg', 'audio/mp3'],
    // MP3: sync word 0xFF 0xFB / 0xFF 0xFA / 0xFF 0xF3 / 0xFF 0xF2, or ID3 tag 'ID3'
    check: (b) =>
      b.length >= 3 &&
      ((b[0] === 0xff && (b[1] & 0xe0) === 0xe0) ||
        (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33)),
  },
  {
    mimes: ['audio/wav', 'audio/x-wav'],
    // WAV: 'RIFF' at offset 0
    check: (b) => b.length >= 4 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46,
  },
];

/**
 * Validates an incoming audio payload before it is decoded and passed to FFmpeg.
 *
 * Checks (in order):
 *   1. base64 string length — rejects payloads > ~14 MB of base64 chars (≈ 10 MB decoded)
 *   2. MIME type — must be in the allowlist
 *   3. magic bytes — the decoded bytes must match a known audio container signature
 *
 * Returns the decoded Buffer on success; throws BadRequestException on any failure.
 */
export function validateAudioBase64(audioBase64: string, mimeType: string): Buffer {
  // Strip optional data-URL prefix before length check
  const payload = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;

  if (!payload || payload.length > MAX_BASE64_CHARS) {
    throw new BadRequestException(
      `Audio payload too large (max ~10 MB). Received ${Math.round((payload?.length ?? 0) / 1_000_000)} MB.`,
    );
  }

  const normalizedMime = (mimeType || '').toLowerCase().trim();
  if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
    throw new BadRequestException(
      `Unsupported audio MIME type: "${normalizedMime}". Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}.`,
    );
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(payload, 'base64');
  } catch {
    throw new BadRequestException('Audio payload is not valid base64.');
  }

  if (buf.length > MAX_DECODED_BYTES) {
    throw new BadRequestException(
      `Decoded audio exceeds 10 MB limit (got ${Math.round(buf.length / 1_048_576)} MB).`,
    );
  }

  if (buf.length === 0) {
    throw new BadRequestException('Audio payload is empty.');
  }

  const rule = MAGIC_BYTES.find((r) => r.mimes.includes(normalizedMime));
  if (rule && !rule.check(buf)) {
    throw new BadRequestException(
      `Audio file content does not match the declared MIME type "${normalizedMime}".`,
    );
  }

  return buf;
}
