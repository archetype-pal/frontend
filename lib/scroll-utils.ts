/** Smooth scrolling, unless the user has asked the system to reduce motion. */
export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
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
