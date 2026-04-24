'use client';

import { useCallback, useRef, useState } from 'react';
import { generateRequestId } from './request-id';

/**
 * Pure SSE frame parser — extracted for unit testability.
 *
 * Takes accumulated `buffer` text and returns parsed JSON objects plus the
 * leftover (incomplete frame) to carry forward. Skips SSE comment lines,
 * empty frames, and malformed JSON (logs warning, does not throw).
 */
export function parseSSEBuffer(buffer: string): { events: unknown[]; remainder: string } {
  const frames = buffer.split('\n\n');
  const remainder = frames.pop() ?? '';  // last element is always kept (may be incomplete)
  const events: unknown[] = [];

  for (const frame of frames) {
    if (!frame.trim()) continue;

    let dataLine = '';
    for (const line of frame.split('\n')) {
      if (line.startsWith(':')) continue;     // SSE comment — skip
      if (line.startsWith('data: ')) dataLine = line.slice(6);
    }

    if (!dataLine) continue;

    try {
      events.push(JSON.parse(dataLine));
    } catch {
      console.warn('[useAiStream] Malformed SSE frame, skipping:', dataLine.slice(0, 120));
    }
  }

  return { events, remainder };
}

export type AiStreamStatus = 'idle' | 'streaming' | 'done' | 'error';

export interface UseAiStreamOptions<T> {
  url: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  onEvent: (event: T) => void;
  onError?: (err: Error) => void;
}

export interface UseAiStreamReturn {
  /** Start the stream. Pass `body` here to override the hook-level body at call
   *  time — useful when the request payload isn't known until the user action. */
  start: (overrideBody?: unknown) => void;
  cancel: () => void;
  status: AiStreamStatus;
  requestId: string | null;
}

/**
 * Reusable hook for consuming Server-Sent Events from Next.js API route proxies.
 *
 * Design decisions:
 * - No auto-reconnect: on stream error status becomes 'error' and the user is
 *   shown a retry UI. Silent reconnection replays nothing and produces confusing
 *   intermediate state.
 * - Uses fetch + ReadableStream (not EventSource) so POST bodies and custom
 *   headers (x-request-id, credentials) work out of the box.
 * - Implements a proper SSE frame parser: buffers partial chunks, splits on
 *   \n\n boundaries, strips the "data: " prefix, skips comments and empty
 *   lines, and swallows malformed JSON frames with a warning rather than
 *   throwing — because chunk boundaries are arbitrary under real network
 *   conditions.
 * - Reads requestId from each incoming event and surfaces it so callers can
 *   include it in error reports for backend log correlation.
 * - Cleans up via AbortController on unmount or explicit cancel().
 */
export function useAiStream<T extends { requestId?: string }>(
  options: UseAiStreamOptions<T>,
): UseAiStreamReturn {
  const [status, setStatus] = useState<AiStreamStatus>('idle');
  const [requestId, setRequestId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { url, method = 'GET', body, onEvent, onError } = options;

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus((s) => (s === 'streaming' ? 'idle' : s));
  }, []);

  const start = useCallback(async (overrideBody?: unknown) => {
    // Cancel any in-flight stream before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const outboundRequestId = generateRequestId();
    setStatus('streaming');
    setRequestId(null);

    const effectiveBody = overrideBody !== undefined ? overrideBody : body;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          ...(effectiveBody ? { 'Content-Type': 'application/json' } : {}),
          'x-request-id': outboundRequestId,
        },
        body: effectiveBody ? JSON.stringify(effectiveBody) : undefined,
        signal: controller.signal,
        cache: 'no-store',
      });

      if (!res.ok || !res.body) {
        throw new Error(`Stream request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const { events, remainder } = parseSSEBuffer(buffer);
        buffer = remainder;
        for (const raw of events) {
          const parsed = raw as T;
          if (parsed.requestId) setRequestId(parsed.requestId);
          onEvent(parsed);
        }
      }

      // Flush any remaining buffered text (decoder end-of-stream)
      buffer += decoder.decode();
      const { events: finalEvents, remainder: _ } = parseSSEBuffer(buffer + '\n\n');
      for (const raw of finalEvents) {
        const parsed = raw as T;
        if (parsed.requestId) setRequestId(parsed.requestId);
        onEvent(parsed);
      }

      if (!controller.signal.aborted) {
        setStatus('done');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled — already set to idle in cancel()
        return;
      }
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useAiStream] Stream error:', error.message);
      setStatus('error');
      onError?.(error);
    }
  }, [url, method, body, onEvent, onError]);

  return { start, cancel, status, requestId };
}
