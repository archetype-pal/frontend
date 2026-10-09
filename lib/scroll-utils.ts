export interface SmoothScrollOptions {
  top?: number;
  duration?: number;
}

export function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  if (typeof window === 'undefined' || !el) return null;

  let current: HTMLElement | null = el.parentElement;
  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

const activeAnimationMap = new WeakMap<object, number>();
let activeWindowFrame: number | null = null;

export function smoothScrollToTop(
  target?: HTMLElement | Window | null,
  options: SmoothScrollOptions = {}
): void {
  if (typeof window === 'undefined') return;

  const { top = 0, duration = 250 } = options;

  let scrollTarget: HTMLElement | Window = window;
  if (target && target !== window) {
    const el = target as HTMLElement;
    const style = window.getComputedStyle(el);
    const isSelfScrollable =
      (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight;
    const scroller = isSelfScrollable ? el : findScrollableAncestor(el);
    if (scroller) {
      scrollTarget = scroller;
    }
  }

  const isWindow = scrollTarget === window;
  const startTop = isWindow
    ? window.scrollY || window.pageYOffset || 0
    : (scrollTarget as HTMLElement).scrollTop;

  const distance = top - startTop;
  if (distance === 0) return;

  if (isWindow) {
    if (activeWindowFrame !== null) {
      cancelAnimationFrame(activeWindowFrame);
      activeWindowFrame = null;
    }
  } else {
    const activeFrame = activeAnimationMap.get(scrollTarget);
    if (activeFrame !== undefined) {
      cancelAnimationFrame(activeFrame);
      activeAnimationMap.delete(scrollTarget);
    }
  }

  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    if (isWindow) {
      window.scrollTo(0, top);
    } else {
      (scrollTarget as HTMLElement).scrollTop = top;
    }
    return;
  }

  // Timed from when the first frame runs: its rAF timestamp predates the render that
  // follows a page change, which would otherwise skip ahead in one jump.
  let startTime: number | null = null;
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  const step = () => {
    const now = performance.now();
    startTime ??= now;
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutCubic(progress);
    const newPos = startTop + distance * easedProgress;

    if (isWindow) {
      window.scrollTo(0, newPos);
    } else {
      (scrollTarget as HTMLElement).scrollTop = newPos;
    }

    if (progress < 1) {
      const nextFrame = requestAnimationFrame(step);
      if (isWindow) {
        activeWindowFrame = nextFrame;
      } else {
        activeAnimationMap.set(scrollTarget, nextFrame);
      }
    } else {
      if (isWindow) {
        activeWindowFrame = null;
      } else {
        activeAnimationMap.delete(scrollTarget);
      }
    }
  };

  const initialFrame = requestAnimationFrame(step);
  if (isWindow) {
    activeWindowFrame = initialFrame;
  } else {
    activeAnimationMap.set(scrollTarget, initialFrame);
  }
}

export interface ScrollToElementOptions {
  duration?: number;
  gap?: number;
}

/** Scroll up until `el`'s top reaches the top of its scroll container; never scrolls down. */
export function smoothScrollToElement(
  el: HTMLElement | null,
  options: ScrollToElementOptions = {}
): void {
  if (typeof window === 'undefined' || !el) return;

  const { duration = 250, gap = 16 } = options;
  const scroller = findScrollableAncestor(el);
  const margin = (parseFloat(window.getComputedStyle(el).scrollMarginTop) || 0) + gap;
  const viewTop = scroller ? scroller.getBoundingClientRect().top : 0;
  const offset = el.getBoundingClientRect().top - margin - viewTop;
  if (offset >= 0) return;

  const current = scroller ? scroller.scrollTop : window.scrollY || window.pageYOffset || 0;
  smoothScrollToTop(scroller ?? window, { top: Math.max(0, current + offset), duration });
}
