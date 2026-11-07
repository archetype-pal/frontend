import { describe, expect, it } from 'vitest';

import { formatCost, formatDuration, formatMicros } from './format-cost';

describe('formatMicros', () => {
  it('keeps enough digits that a fraction of a cent does not read as zero', () => {
    expect(formatMicros(18_800, 'USD', 'en')).toBe('$0.0188');
    expect(formatMicros(12, 'USD', 'en')).toBe('$0.000012');
    expect(formatMicros(4_210_000, 'USD', 'en')).toBe('$4.21');
    expect(formatMicros(0, 'USD', 'en')).toBe('$0.00');
  });

  it('shows a bare amount without a currency, and names a code Intl does not know', () => {
    expect(formatMicros(5_000_000, '', 'en')).toBe('5.00');
    expect(formatMicros(5_000_000, 'XYZ1', 'en')).toBe('5.00 XYZ1');
  });

  it('follows the locale', () => {
    // German puts a non-breaking space before the sign.
    expect(formatMicros(4_210_000, 'EUR', 'de')).toMatch(/^4,21\s€$/);
  });
});

describe('formatCost', () => {
  it('shows a dash for a call that billed nothing and named no currency', () => {
    expect(formatCost({ cost_micros: 0, cost_currency: '' }, 'en')).toBe('—');
  });

  it('shows a billed zero as money', () => {
    expect(formatCost({ cost_micros: 0, cost_currency: 'USD' }, 'en')).toBe('$0.00');
  });
});

describe('formatDuration', () => {
  it('uses milliseconds below a second and seconds above', () => {
    expect(formatDuration(840, 'en')).toBe('840 ms');
    expect(formatDuration(12_940, 'en')).toBe('12.9 s');
  });
});
