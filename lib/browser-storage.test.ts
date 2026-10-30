/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { canUseStorage } from './browser-storage';

describe('canUseStorage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is true in a browser with localStorage', () => {
    expect(canUseStorage()).toBe(true);
  });

  it('is false without a window', () => {
    vi.stubGlobal('window', undefined);
    expect(canUseStorage()).toBe(false);
  });
});
