import * as React from 'react';

/**
 * The manuscript page's section rule — a display-face title, a fading hairline,
 * and an optional right-aligned aside. Extracted from `manuscript-viewer.tsx`
 * so the msDesc section (`msdesc-section.tsx`) heads itself the same way
 * without importing back into its parent.
 */
export function SectionHeading({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-8 flex items-center gap-5">
      <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <span
        aria-hidden
        className="h-px flex-1 bg-gradient-to-r from-border via-border/50 to-transparent"
      />
      {aside ? (
        <span className="hidden whitespace-nowrap text-xs uppercase tracking-[0.18em] text-muted-foreground sm:inline">
          {aside}
        </span>
      ) : null}
    </div>
  );
}
