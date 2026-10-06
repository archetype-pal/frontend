/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findScrollableAncestor, smoothScrollToElement, smoothScrollToTop } from './scroll-utils';

describe('scroll-utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('findScrollableAncestor', () => {
    it('returns null when el is null', () => {
      expect(findScrollableAncestor(null)).toBeNull();
    });

    it('returns null when no ancestor has scrollable overflow', () => {
      const parent = document.createElement('div');
      const child = document.createElement('div');
      parent.appendChild(child);
      document.body.appendChild(parent);

      expect(findScrollableAncestor(child)).toBeNull();
      document.body.removeChild(parent);
    });

    it('returns the nearest ancestor with overflow-y: auto and scrollHeight > clientHeight', () => {
      const grandParent = document.createElement('div');
      const parent = document.createElement('div');
      const child = document.createElement('div');

      grandParent.style.overflowY = 'auto';
      Object.defineProperty(grandParent, 'scrollHeight', { value: 500, configurable: true });
      Object.defineProperty(grandParent, 'clientHeight', { value: 200, configurable: true });

      parent.style.overflowY = 'visible';

      grandParent.appendChild(parent);
      parent.appendChild(child);
      document.body.appendChild(grandParent);

      expect(findScrollableAncestor(child)).toBe(grandParent);
      document.body.removeChild(grandParent);
    });
  });

  describe('smoothScrollToTop', () => {
    it('does nothing when already at top (distance === 0)', () => {
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
      Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });

      smoothScrollToTop(window);
      expect(scrollToSpy).not.toHaveBeenCalled();
    });

    it('immediately snaps to top when prefers-reduced-motion is active on window', () => {
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
      Object.defineProperty(window, 'scrollY', { value: 300, configurable: true, writable: true });

      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList);

      smoothScrollToTop(window);
      expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });

    it('immediately snaps to top when prefers-reduced-motion is active on an HTMLElement', () => {
      const container = document.createElement('div');
      container.style.overflowY = 'auto';
      Object.defineProperty(container, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(container, 'clientHeight', { value: 400, configurable: true });
      container.scrollTop = 400;

      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList);

      smoothScrollToTop(container);
      expect(container.scrollTop).toBe(0);
    });

    it('animates an HTMLElement to top using requestAnimationFrame over duration', () => {
      const container = document.createElement('div');
      container.style.overflowY = 'auto';
      Object.defineProperty(container, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(container, 'clientHeight', { value: 400, configurable: true });
      container.scrollTop = 500;

      let rafCallback: FrameRequestCallback | null = null;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 1;
      });

      smoothScrollToTop(container, { duration: 250 });

      expect(rafCallback).not.toBeNull();
      const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
      if (rafCallback) (rafCallback as FrameRequestCallback)(0);
      expect(container.scrollTop).toBe(500);

      now.mockReturnValue(1125);
      if (rafCallback) (rafCallback as FrameRequestCallback)(0);

      expect(container.scrollTop).toBeLessThan(500);
      expect(container.scrollTop).toBeGreaterThan(0);

      now.mockReturnValue(1250);
      if (rafCallback) (rafCallback as FrameRequestCallback)(0);

      expect(container.scrollTop).toBe(0);
    });

    it('animates window to top over duration', () => {
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
      Object.defineProperty(window, 'scrollY', { value: 600, configurable: true, writable: true });

      let rafCallback: FrameRequestCallback | null = null;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 1;
      });

      smoothScrollToTop(window, { duration: 250 });

      expect(rafCallback).not.toBeNull();
      const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
      if (rafCallback) (rafCallback as FrameRequestCallback)(0);
      now.mockReturnValue(1250);
      if (rafCallback) (rafCallback as FrameRequestCallback)(0);

      expect(scrollToSpy).toHaveBeenLastCalledWith(0, 0);
    });
  });

  describe('smoothScrollToElement', () => {
    function reduceMotion() {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList);
    }

    // Container scrolled to 600, its visible area 100px down the viewport.
    function mount(elementTop: number) {
      const container = document.createElement('div');
      const element = document.createElement('div');
      container.style.overflowY = 'auto';
      Object.defineProperty(container, 'scrollHeight', { value: 3000, configurable: true });
      Object.defineProperty(container, 'clientHeight', { value: 800, configurable: true });
      container.scrollTop = 600;
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect);
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ top: elementTop } as DOMRect);
      container.appendChild(element);
      document.body.appendChild(container);
      return { container, element };
    }

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('scrolls up until the element top sits a gap below the container top', () => {
      reduceMotion();
      const { container, element } = mount(-200);

      smoothScrollToElement(element);

      expect(container.scrollTop).toBe(600 - 300 - 16);
    });

    it('leaves the scroll alone when the element top is already in view', () => {
      reduceMotion();
      const { container, element } = mount(400);

      smoothScrollToElement(element);

      expect(container.scrollTop).toBe(600);
    });

    it('keeps the CSS scroll-margin-top clear, e.g. for a sticky header', () => {
      reduceMotion();
      const { container, element } = mount(-200);
      element.style.scrollMarginTop = '64px';

      smoothScrollToElement(element, { gap: 0 });

      expect(container.scrollTop).toBe(600 - 300 - 64);
    });
  });
});
