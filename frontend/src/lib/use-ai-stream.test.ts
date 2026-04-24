import { describe, it, expect } from 'vitest';
import { parseSSEBuffer } from './use-ai-stream';

describe('parseSSEBuffer', () => {
  it('parses a single complete frame', () => {
    const { events, remainder } = parseSSEBuffer(
      'data: {"event":"task_ready","value":1}\n\n',
    );
    expect(events).toEqual([{ event: 'task_ready', value: 1 }]);
    expect(remainder).toBe('');
  });

  it('parses multiple frames in one buffer', () => {
    const { events } = parseSSEBuffer(
      'data: {"event":"a"}\n\ndata: {"event":"b"}\n\n',
    );
    expect(events).toHaveLength(2);
    expect((events[0] as { event: string }).event).toBe('a');
    expect((events[1] as { event: string }).event).toBe('b');
  });

  it('keeps an incomplete frame in the remainder', () => {
    const input = 'data: {"event":"a"}\n\ndata: {"event":"b"'; // no closing \n\n
    const { events, remainder } = parseSSEBuffer(input);
    expect(events).toHaveLength(1);
    expect(remainder).toBe('data: {"event":"b"');
  });

  it('handles frames arriving across two chunks', () => {
    // Simulate two sequential calls representing chunk boundaries
    const chunk1 = 'data: {"event":"crit';
    const chunk2 = 'erion","key":"a"}\n\ndata: {"event":"done"}\n\n';

    const { events: e1, remainder: r1 } = parseSSEBuffer(chunk1);
    expect(e1).toHaveLength(0);
    expect(r1).toBe(chunk1);  // incomplete — held in buffer

    const { events: e2 } = parseSSEBuffer(r1 + chunk2);
    expect(e2).toHaveLength(2);
    expect((e2[0] as { key: string }).key).toBe('a');
  });

  it('skips malformed JSON frames without throwing', () => {
    const { events } = parseSSEBuffer(
      'data: {not json}\n\ndata: {"event":"ok"}\n\n',
    );
    expect(events).toEqual([{ event: 'ok' }]);
  });

  it('skips SSE comment lines', () => {
    const { events } = parseSSEBuffer(
      ': keep-alive\n\ndata: {"event":"ok"}\n\n',
    );
    expect(events).toEqual([{ event: 'ok' }]);
  });

  it('skips empty frames', () => {
    const { events } = parseSSEBuffer(
      '\n\ndata: {"event":"ok"}\n\n\n\n',
    );
    expect(events).toEqual([{ event: 'ok' }]);
  });

  it('returns empty events and empty remainder for empty input', () => {
    const { events, remainder } = parseSSEBuffer('');
    expect(events).toHaveLength(0);
    expect(remainder).toBe('');
  });

  it('returns requestId from event payload if present', () => {
    const { events } = parseSSEBuffer(
      'data: {"event":"task_ready","requestId":"req-abc"}\n\n',
    );
    expect((events[0] as { requestId: string }).requestId).toBe('req-abc');
  });
});
