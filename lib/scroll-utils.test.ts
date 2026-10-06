/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { scrollUpToElement } from './scroll-utils';

function listAt(top: number, scrollMarginTop = '') {
  const el = document.createElement('div');
  el.style.scrollMarginTop = scrollMarginTop;
  el.getBoundingClientRect = () => ({ top }) as DOMRect;
  el.scrollIntoView = vi.fn();
  return el;
}

function preferReducedMotion(reduce: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) => ({ matches: reduce && query.includes('reduce') }) as MediaQueryList
  );
}

describe('scrollUpToElement', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('smoothly scrolls a list whose top has scrolled out of view back to its top', () => {
    preferReducedMotion(false);
    const list = listAt(-400);

    scrollUpToElement(list);

    expect(list.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
  });

  it('never scrolls down to a list whose top is already in view', () => {
    const list = listAt(120);

    scrollUpToElement(list);

    expect(list.scrollIntoView).not.toHaveBeenCalled();
  });

  it('scrolls to a list whose top is hidden under a sticky header', () => {
    const list = listAt(30, '64px');

    scrollUpToElement(list);

    expect(list.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('jumps without animation when the user prefers reduced motion', () => {
    preferReducedMotion(true);
    const list = listAt(-400);

    scrollUpToElement(list);

    expect(list.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
  });
});
