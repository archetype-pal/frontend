import { describe, expect, it } from 'vitest';

import { errorMessage } from './error-message';

describe('errorMessage', () => {
  it('reads the message of an Error', () => {
    expect(errorMessage(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('uses the fallback for anything else', () => {
    expect(errorMessage('string', 'fallback')).toBe('fallback');
    expect(errorMessage(undefined, 'fallback')).toBe('fallback');
  });

  it('stringifies the value when no fallback is given', () => {
    expect(errorMessage(42)).toBe('42');
    expect(errorMessage({ toString: () => 'custom' })).toBe('custom');
  });
});
