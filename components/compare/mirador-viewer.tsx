'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface MiradorViewerProps {
  /** IIIF Presentation manifest URLs, one per window, opened side by side. */
  manifestUrls: string[];
  /** Mirador UI language; one of its bundled locales (`en`, `fr`, `de`, …). */
  language?: string;
  className?: string;
}

let miradorInstanceCounter = 0;

/**
 * Thin wrapper around Mirador's imperative `Mirador.viewer(config)` API.
 * Mirador manages its own React root + Redux store inside the container div —
 * it isn't a React component itself — so it's booted in an effect rather than
 * rendered directly, and loaded dynamically since it (and its MUI/emotion
 * peers) are heavy and only ever needed on the /compare page.
 */
export function MiradorViewer({ manifestUrls, language, className }: MiradorViewerProps) {
  const [containerId] = React.useState(() => `mirador-viewer-${++miradorInstanceCounter}`);
  const manifestUrlsKey = manifestUrls.join('|');

  React.useEffect(() => {
    let cancelled = false;
    let instance: { unmount(): void } | null = null;

    import('mirador').then(({ default: Mirador }) => {
      if (cancelled) return;
      instance = Mirador.viewer({
        id: containerId,
        language,
        workspace: { type: 'mosaic', showZoomControls: true },
        window: { allowClose: false, allowMaximize: false, sideBarOpenByDefault: false },
        windows: manifestUrls.map((manifestId) => ({ manifestId })),
      });
    });

    return () => {
      cancelled = true;
      // `Mirador.viewer()` calls `createRoot()` on the container; without this
      // the previous root (and its Redux store, sagas and OpenSeadragon
      // viewers) would outlive the component, and rebooting into the same div
      // would stack a second root on top of it.
      instance?.unmount();
      instance = null;
    };
    // manifestUrls is intentionally tracked via manifestUrlsKey: Mirador only
    // needs to reboot when the actual set of manifests changes, not on every
    // render that happens to pass a new array with the same contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId, language, manifestUrlsKey]);

  return (
    <div
      id={containerId}
      className={cn('overflow-hidden', className)}
      style={{ contain: 'layout' }}
    />
  );
}
