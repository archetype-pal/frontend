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
    // Mirador's root workspace is styled `position: absolute; inset: 0`, so it
    // fills the nearest *positioned* ancestor. Without `relative` here, that
    // ancestor is the page itself — Mirador then covers the whole viewport,
    // including the site header, instead of staying inside this component.
    <div id={containerId} className={cn('relative overflow-hidden', className)} />
  );
}
