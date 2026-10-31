/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { scrollIntoNearestScroller, scrollUpToElement } from './scroll-utils';

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

function scroller(top: number, height: number, scrollable = true) {
  const el = document.createElement('div');
  el.style.overflowY = 'auto';
  Object.defineProperty(el, 'scrollHeight', { value: scrollable ? height * 3 : height });
  Object.defineProperty(el, 'clientHeight', { value: height });
  el.getBoundingClientRect = () => ({ top, bottom: top + height }) as DOMRect;
  el.scrollBy = vi.fn();
  return el;
}

function childAt(parent: HTMLElement, top: number, height: number) {
  const el = document.createElement('span');
  el.getBoundingClientRect = () => ({ top, bottom: top + height, height }) as DOMRect;
  parent.appendChild(el);
  return el;
}

describe('scrollIntoNearestScroller', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('centres an element that sits below the visible part of its scroller', () => {
    preferReducedMotion(false);
    const box = scroller(0, 200);
    const span = childAt(box, 500, 20);

    scrollIntoNearestScroller(span);

    expect(box.scrollBy).toHaveBeenCalledWith({ top: 410, behavior: 'smooth' });
  });

  it('does nothing for an element already in view', () => {
    const box = scroller(0, 200);
    const span = childAt(box, 50, 20);

    scrollIntoNearestScroller(span);

    expect(box.scrollBy).not.toHaveBeenCalled();
  });

  it('skips an overflow container that has nothing to scroll', () => {
    const outer = scroller(0, 200);
    const inner = scroller(0, 100, false);
    outer.appendChild(inner);
    const span = childAt(inner, 500, 20);

    scrollIntoNearestScroller(span);

    expect(inner.scrollBy).not.toHaveBeenCalled();
    expect(outer.scrollBy).toHaveBeenCalledTimes(1);
  });

  it('jumps without animation when the user prefers reduced motion', () => {
    preferReducedMotion(true);
    const box = scroller(0, 200);
    const span = childAt(box, 500, 20);

    scrollIntoNearestScroller(span);

    expect(box.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
  });
});
