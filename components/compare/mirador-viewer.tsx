'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface MiradorViewerProps {
  /** IIIF Presentation manifest URLs, one per window, opened side by side. */
  manifestUrls: string[];
  className?: string;
}

let miradorInstanceCounter = 0;

/**
 * Thin wrapper around Mirador's imperative `Mirador.viewer(config)` API.
 * Mirador manages its own React/Redux tree inside the container div — it
 * isn't a React component itself — so it's booted in an effect rather than
 * rendered directly, and loaded dynamically since it (and its MUI/emotion
 * peers) are heavy and only ever needed on the /compare page.
 */
export function MiradorViewer({ manifestUrls, className }: MiradorViewerProps) {
  const [containerId] = React.useState(() => `mirador-viewer-${++miradorInstanceCounter}`);
  const manifestUrlsKey = manifestUrls.join('|');

  React.useEffect(() => {
    let cancelled = false;

    import('mirador').then(({ default: Mirador }) => {
      if (cancelled) return;
      Mirador.viewer({
        id: containerId,
        workspace: { type: 'mosaic', showZoomControls: true },
        window: { allowClose: false, allowMaximize: false, sideBarOpenByDefault: false },
        windows: manifestUrls.map((manifestId) => ({ manifestId })),
      });
    });

    return () => {
      cancelled = true;
      // Mirador has no documented teardown API. Its DOM is dropped when
      // React unmounts the container div below; a route change (the only
      // way off /compare) then discards this Redux store/instance with it.
    };
    // manifestUrls is intentionally tracked via manifestUrlsKey: Mirador only
    // needs to reboot when the actual set of manifests changes, not on every
    // render that happens to pass a new array with the same contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId, manifestUrlsKey]);

  return (
    // Two separate escapes to plug, both because Mirador (a MUI app) assumes
    // it owns the page:
    // 1. Its root workspace is `position: absolute; inset: 0`, which sizes
    //    itself against the nearest *positioned* ancestor — `overflow-hidden`
    //    alone doesn't give it one, so without `contain: layout` that
    //    ancestor is the page itself and Mirador covers the whole viewport.
    // 2. Its AppBar-based toolbar carries MUI's default z-index (1100+, for
    //    sitting above typical app content). With no stacking context of our
    //    own, that value competes directly against the site header's — and
    //    wins — once the page scrolls the two into overlapping. `contain:
    //    layout` establishes both a containing block *and* a new stacking
    //    context for this subtree, so nothing inside Mirador can size or
    //    stack itself against anything outside this div.
    <div id={containerId} className={cn('overflow-hidden', className)} style={{ contain: 'layout' }} />
  );
}
