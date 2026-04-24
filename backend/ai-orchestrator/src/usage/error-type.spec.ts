import { describe, it, expect } from 'vitest';
import { classifyError, ErrorType } from './error-type';

describe('classifyError', () => {
  it('classifies timeout by message', () => {
    const r = classifyError(new Error('Request timeout after 15000ms'));
    expect(r.type).toBe(ErrorType.TIMEOUT);
    expect(r.retryable).toBe(true);
  });

  it('classifies network error as retryable', () => {
    const r = classifyError(new Error('fetch failed: ECONNREFUSED'));
    expect(r.type).toBe(ErrorType.NETWORK);
    expect(r.retryable).toBe(true);
  });

  it('classifies quota error as non-retryable', () => {
    const r = classifyError(new Error('You exceeded your current quota, please check your billing.'));
    expect(r.type).toBe(ErrorType.QUOTA);
    expect(r.retryable).toBe(false);
  });

  it('classifies 429 rate limit (no quota message) as retryable', () => {
    const err = Object.assign(new Error('Too Many Requests'), { status: 429 });
    const r = classifyError(err);
    expect(r.type).toBe(ErrorType.RATE_LIMIT);
    expect(r.retryable).toBe(true);
    expect(r.backoffMs).toBeUndefined();
  });

  it('classifies 429 quota exhausted as non-retryable', () => {
    const err = Object.assign(new Error('exceeded your current quota'), { status: 429 });
    const r = classifyError(err);
    expect(r.type).toBe(ErrorType.QUOTA);
    expect(r.retryable).toBe(false);
  });

  it('reads Retry-After header from 429', () => {
    const headers = { get: (k: string) => (k === 'retry-after' ? '30' : null) };
    const err = Object.assign(new Error('Too Many Requests'), { status: 429, headers });
    const r = classifyError(err);
    expect(r.type).toBe(ErrorType.RATE_LIMIT);
    expect(r.retryable).toBe(true);
    expect(r.backoffMs).toBe(30_000);
  });

  it('classifies 503 as service_unavailable and retryable', () => {
    const err = Object.assign(new Error('Service Unavailable'), { status: 503 });
    const r = classifyError(err);
    expect(r.type).toBe(ErrorType.SERVICE_UNAVAILABLE);
    expect(r.retryable).toBe(true);
  });

  it('classifies 403 (other 4xx) as non-retryable unknown', () => {
    const err = Object.assign(new Error('Forbidden'), { status: 403 });
    const r = classifyError(err);
    expect(r.type).toBe(ErrorType.UNKNOWN);
    expect(r.retryable).toBe(false);
  });

  it('classifies parse error as non-retryable', () => {
    const err = new SyntaxError('Unexpected token < in JSON');
    const r = classifyError(err);
    expect(r.type).toBe(ErrorType.PARSE_ERROR);
    expect(r.retryable).toBe(false);
  });

  it('classifies azure unsupported language as non-retryable', () => {
    const r = classifyError(new Error('unsupported language locale'));
    expect(r.type).toBe(ErrorType.AZURE_UNSUPPORTED_LANGUAGE);
    expect(r.retryable).toBe(false);
  });

  it('classifies unknown errors as non-retryable', () => {
    const r = classifyError(new Error('some completely new error message'));
    expect(r.type).toBe(ErrorType.UNKNOWN);
    expect(r.retryable).toBe(false);
  });

  it('classifies non-Error values as non-retryable unknown', () => {
    const r = classifyError('string error');
    expect(r.type).toBe(ErrorType.UNKNOWN);
    expect(r.retryable).toBe(false);
  });
});
