import { describe, expect, it } from 'vitest';

import { formatAge } from './format-age';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('formatAge', () => {
  it('reports zero as "today"', () => {
    expect(formatAge(0)).toBe('today');
  });

  it('hours / days / weeks at the right boundaries', () => {
    expect(formatAge(2 * HOUR)).toBe('2h');
    expect(formatAge(2 * DAY)).toBe('2d');
    expect(formatAge(8 * DAY)).toBe('1w');
    expect(formatAge(15 * DAY)).toBe('2w');
  });
});
