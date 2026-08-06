import { describe, expect, it } from 'vitest';

import { formatBytes } from './format-bytes';

describe('formatBytes', () => {
  it('returns an em dash for null', () => {
    expect(formatBytes(null)).toBe('—');
  });

  it('returns an em dash for undefined', () => {
    expect(formatBytes(undefined)).toBe('—');
  });

  it('returns an em dash for negative numbers', () => {
    expect(formatBytes(-1)).toBe('—');
  });

  it('returns an em dash for NaN', () => {
    expect(formatBytes(Number.NaN)).toBe('—');
  });

  it('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats sub-KB values as whole bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats exactly 1024 bytes as 1.0 KB', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });

  it('formats megabytes with one decimal by default', () => {
    expect(formatBytes(123456789)).toBe('117.7 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(987654321)).toBe('941.9 MB');
  });

  it('formats large database sizes into GB', () => {
    expect(formatBytes(5 * 1024 ** 3)).toBe('5.0 GB');
  });

  it('respects a custom decimals argument', () => {
    expect(formatBytes(123456789, 2)).toBe('117.74 MB');
  });
});
