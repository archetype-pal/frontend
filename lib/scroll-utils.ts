/** Smooth scrolling, unless the user has asked the system to reduce motion. */
export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/**
 * Centre `el` within its nearest scrollable ancestor, never the window: the viewers are 100dvh,
 * so a plain `scrollIntoView` would yank the whole page. No-op when `el` is already in view.
 */
export function scrollIntoNearestScroller(el: HTMLElement): void {
  let scroller: HTMLElement | null = el.parentElement;
  while (scroller) {
    const overflowY = getComputedStyle(scroller).overflowY;
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      scroller.scrollHeight > scroller.clientHeight
    ) {
      break;
    }
    scroller = scroller.parentElement;
  }
  if (!scroller) return;
  const sRect = scroller.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  if (eRect.top >= sRect.top && eRect.bottom <= sRect.bottom) return;
  const delta = eRect.top + eRect.height / 2 - (sRect.top + scroller.clientHeight / 2);
  scroller.scrollBy({ top: delta, behavior: scrollBehavior() });
}

/**
 * Scroll back up to the top of a list after its page changes. A list whose top is already in
 * view stays where it is, so this never scrolls down. The list's `scroll-margin-top` keeps its
 * top clear of a sticky header.
 */
export function scrollUpToElement(el: HTMLElement | null): void {
  if (!el) return;
  const margin = Number.parseFloat(window.getComputedStyle(el).scrollMarginTop) || 0;
  if (el.getBoundingClientRect().top >= margin) return;
  el.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
}
