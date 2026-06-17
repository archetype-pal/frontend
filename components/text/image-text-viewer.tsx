'use client';

import * as React from 'react';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { toDptHtml } from '@/lib/tei-to-dpt-html';
import { cn } from '@/lib/utils';

interface ImageTextViewerProps {
  html: string;
  className?: string;
  /**
   * Opt into the `.tei-rich` element styling — coloured underlines + hover
   * labels for persons/places/expansions (the markup the text annotator
   * surfaces). Off by default so standalone text pages render plain prose.
   */
  richMarkup?: boolean;
  /**
   * A search term to highlight in the rendered transcription. Matches are
   * wrapped in <mark> and the first is scrolled into view — so arriving from a
   * search hit lands the reader on the passage where the term occurs.
   */
  highlightQuery?: string;
}

/** Wrap each case-insensitive occurrence of `query` in a <mark>; return the first. */
function markSearchHits(root: HTMLElement, query: string): HTMLElement | null {
  const needle = query.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const value = node.nodeValue;
      if (!value || !value.toLowerCase().includes(needle)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const targets: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    targets.push(node as Text);
    node = walker.nextNode();
  }

  let first: HTMLElement | null = null;
  for (const textNode of targets) {
    const text = textNode.nodeValue ?? '';
    const lower = text.toLowerCase();
    const frag = document.createDocumentFragment();
    let cursor = 0;
    let hit = lower.indexOf(needle, cursor);
    while (hit !== -1) {
      if (hit > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, hit)));
      const mark = document.createElement('mark');
      mark.dataset.searchHit = 'true';
      mark.className = 'bg-yellow-200/70 dark:bg-yellow-500/30 rounded px-0.5';
      mark.textContent = text.slice(hit, hit + needle.length);
      frag.appendChild(mark);
      if (!first) first = mark;
      cursor = hit + needle.length;
      hit = lower.indexOf(needle, cursor);
    }
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
    textNode.parentNode?.replaceChild(frag, textNode);
  }
  return first;
}

/**
 * Scroll `el` into view within its nearest scrollable ancestor only — never the
 * window (the viewer is 100dvh, so a plain scrollIntoView would yank the page).
 */
function scrollIntoNearestScroller(el: HTMLElement): void {
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
  scroller.scrollBy({ top: delta, behavior: 'smooth' });
}

export function ImageTextViewer({
  html,
  className,
  richMarkup = false,
  highlightQuery,
}: ImageTextViewerProps) {
  // Content may be legacy data-dpt HTML or (post-Phase-H) TEI XML; render both
  // as data-dpt HTML so the prose CSS and text↔region linking are unchanged.
  const safeHtml = React.useMemo(
    () => sanitizeHtml(toDptHtml(html), { allowDataAttr: true }),
    [html]
  );
  const ref = React.useRef<HTMLDivElement>(null);

  // The rendered markup, derived during render so React (not a post-mount DOM
  // hack) owns it — search-term <mark>s are baked into the HTML React renders, so
  // they can't be wiped by a re-commit. Without a query (and during SSR, where
  // `document` is absent) this is the unmarked `safeHtml`, matching the server
  // output; once the parent supplies the term post-mount, the marks are injected
  // client-side. The parent seeds `highlightQuery` empty on the first client
  // render (it reads the URL in an effect), so the initial client render also
  // produces unmarked `safeHtml` and stays hydration-safe.
  const renderedHtml = React.useMemo(() => {
    const query = highlightQuery?.trim();
    if (!query || typeof document === 'undefined') {
      return safeHtml;
    }
    const scratch = document.createElement('div');
    scratch.innerHTML = safeHtml;
    markSearchHits(scratch, query);
    return scratch.innerHTML;
  }, [safeHtml, highlightQuery]);

  // Scroll the first match into view once the highlighted markup is committed.
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !highlightQuery?.trim()) return;
    const first = el.querySelector<HTMLElement>('mark[data-search-hit]');
    if (first) scrollIntoNearestScroller(first);
  }, [renderedHtml, highlightQuery]);

  // Junicode (font-transcription) renders the Latin transcription — and the
  // translation, for visual consistency — with full medieval-Latin glyph
  // coverage. Applied here so every consumer (viewer panel, text pages,
  // backoffice preview/editor) gets it.
  return (
    <div
      ref={ref}
      className={cn(
        'font-transcription',
        richMarkup && 'tei-rich',
        className ?? 'prose prose-sm dark:prose-invert max-w-none'
      )}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
