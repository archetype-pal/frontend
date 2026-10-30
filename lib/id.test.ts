import { afterEach, describe, expect, it, vi } from 'vitest';

import { newId } from './id';

describe('newId', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('mints a distinct id each time', () => {
    expect(newId()).not.toBe(newId());
  });

  it('puts the prefix in front with a dash', () => {
    expect(newId('note')).toMatch(/^note-.+/);
  });

  it('falls back to a random string when randomUUID is missing (plain-HTTP origins)', () => {
    vi.stubGlobal('crypto', {});
    expect(() => newId()).not.toThrow();
    expect(newId('tab')).toMatch(/^tab-[0-9a-z]+-[0-9a-z]+$/);
  });
});
