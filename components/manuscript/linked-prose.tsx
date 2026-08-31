'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils';

/**
 * A catalogue description rendered as linked prose, with an entity hover card
 * (docs/tei.md §4.5 phase 5).
 *
 * The card needs NO new backend: a person link already carries
 * `data-ref-key="person_{id}"`, and `/api/v1/scribes/{id}/` is public. Kinds
 * without a stable authority — place and search links, which resolve to a query
 * rather than a record — have nothing to glose and get no card. That is a
 * limitation of the data model, not of this component: there is no Place model
 * (docs/tei.md §3.4).
 *
 * Hover state is delegated from the container rather than bound per anchor: the
 * prose is `dangerouslySetInnerHTML`, so there are no React elements to attach
 * to. Focus is handled alongside hover so the card is reachable from the
 * keyboard.
 */

interface ScribeGloss {
  id: number;
  name?: string;
  period?: string | null;
  scriptorium?: string | null;
  idiographs?: unknown[];
}

interface HoverTarget {
  key: string;
  label: string;
  /** Anchor position relative to the container, for placement. */
  left: number;
  top: number;
}

const PERSON_KEY_RE = /^person_(\d+)$/;

/** Per-session gloss cache: the same person is hovered repeatedly in one page. */
const glossCache = new Map<string, ScribeGloss>();

export function LinkedProse({
  html,
  gloss,
  className,
}: {
  html: string;
  /**
   * Whether this prose can contain entity links worth glossing. False for a
   * legacy HTML row, whose markup is arbitrary third-party HTML with no `<ref>`
   * in it — no listeners, no fetches.
   */
  gloss: boolean;
  /** Applied to the prose itself; the caller owns its visual treatment. */
  className?: string;
}) {
  const t = useTranslations('manuscript');
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [target, setTarget] = React.useState<HoverTarget | null>(null);

  const scribeId = target ? (PERSON_KEY_RE.exec(target.key)?.[1] ?? null) : null;
  const [fetched, setFetched] = React.useState<{ id: string; gloss: ScribeGloss } | null>(null);

  // Read the cache during render rather than syncing it into state — the same
  // person is hovered repeatedly in one page, and a cached gloss should paint on
  // the first frame instead of after a state round trip.
  const data =
    scribeId === null
      ? null
      : (glossCache.get(scribeId) ?? (fetched?.id === scribeId ? fetched.gloss : null));

  // Plain fetch, not react-query: this renders inside the PUBLIC page, which has
  // no QueryClientProvider, and a hover gloss is one cached GET — not worth
  // making a server-rendered surface depend on a client cache.
  React.useEffect(() => {
    if (scribeId === null || glossCache.has(scribeId)) return;

    let live = true;
    void (async () => {
      try {
        const response = await apiFetch(`/api/v1/scribes/${scribeId}/`);
        if (!response.ok) return;
        const gloss = (await response.json()) as ScribeGloss;
        glossCache.set(scribeId, gloss);
        if (live) setFetched({ id: scribeId, gloss });
      } catch {
        // A gloss is an enhancement; the link itself still works.
      }
    })();
    return () => {
      live = false;
    };
  }, [scribeId]);

  const isLoading = scribeId !== null && data === null;

  // Delegated, because the prose is injected as HTML and has no React nodes.
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !gloss) return;

    // Bound on the DOCUMENT, not the container. Opening and closing both hang
    // off `mouseover`: it fires for every element the pointer enters, so
    // entering anything that is not one of OUR anchors is the close signal.
    //
    // Two earlier shapes were wrong, both found by driving a real browser:
    // `mouseout` does not reliably reach the container, and a container-scoped
    // `mouseover` never fires when the pointer moves to a DIFFERENT instance —
    // a page carries one of these per description plus one for the structured
    // description, so a card would stay open while the reader hovered another.
    const point = (event: Event) => {
      const anchor = (event.target as HTMLElement | null)?.closest<HTMLElement>('a[data-ref-key]');
      const key = anchor?.dataset.refKey ?? '';
      if (!anchor || !container.contains(anchor) || !PERSON_KEY_RE.test(key)) {
        setTarget(null);
        return;
      }

      const box = anchor.getBoundingClientRect();
      const host = container.getBoundingClientRect();
      setTarget({
        key,
        label: anchor.textContent ?? '',
        left: box.left - host.left,
        top: box.bottom - host.top,
      });
    };

    document.addEventListener('mouseover', point);
    document.addEventListener('focusin', point);
    return () => {
      document.removeEventListener('mouseover', point);
      document.removeEventListener('focusin', point);
    };
  }, [gloss]);

  const details = [data?.period, data?.scriptorium]
    .map((value) => (value ?? '').trim())
    .filter(Boolean)
    .join(' · ');

  return (
    <div ref={containerRef} className="relative">
      <div className={className} dangerouslySetInnerHTML={{ __html: html }} />

      {target ? (
        <div
          role="tooltip"
          style={{ left: target.left, top: target.top }}
          className={cn(
            'absolute z-30 mt-1 w-72 rounded-md border bg-popover p-3 text-popover-foreground shadow-md',
            'pointer-events-none text-sm'
          )}
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t('entityCard.person')}
          </p>
          <p className="mt-0.5 font-serif text-base leading-tight">{data?.name ?? target.label}</p>
          {isLoading ? (
            <p className="mt-1 text-xs text-muted-foreground">{t('entityCard.loading')}</p>
          ) : null}
          {details ? <p className="mt-1 text-xs text-muted-foreground">{details}</p> : null}
          {data?.idiographs?.length ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t('entityCard.idiographs', { count: data.idiographs.length })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
