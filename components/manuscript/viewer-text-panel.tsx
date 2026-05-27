'use client';

import * as React from 'react';
import { X } from 'lucide-react';

import { ImageTextViewer } from '@/components/text/image-text-viewer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ImageTextDetail } from '@/services/image-texts';

interface ViewerTextPanelProps {
  texts: ImageTextDetail[];
  /** Graph id of the region currently selected on the image (region → text). */
  linkedGraphId: number | null;
  /** Hovering a linked span highlights its region on the image. */
  onSpanHover: (graphId: number | null) => void;
  /** Clicking a linked span selects + centres its region on the image. */
  onSpanActivate: (graphId: number) => void;
  onClose: () => void;
}

// A span can carry several ids ("10,11") when one element was annotated by
// more than one region; parse them all so hover/highlight covers each.
function graphIdsOf(el: Element | null): number[] {
  const raw = el?.getAttribute('data-graph-id');
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((value) => Number.isFinite(value));
}

const TYPE_ORDER = (type: string): number =>
  type === 'Transcription' ? 0 : type === 'Translation' ? 1 : 2;

export function ViewerTextPanel({
  texts,
  linkedGraphId,
  onSpanHover,
  onSpanActivate,
  onClose,
}: ViewerTextPanelProps) {
  const ordered = React.useMemo(
    () => [...texts].sort((a, b) => TYPE_ORDER(a.type) - TYPE_ORDER(b.type)),
    [texts]
  );

  const [activeId, setActiveId] = React.useState<number | null>(ordered[0]?.id ?? null);
  React.useEffect(() => {
    if (!ordered.some((t) => t.id === activeId)) {
      setActiveId(ordered[0]?.id ?? null);
    }
  }, [ordered, activeId]);

  const active = ordered.find((t) => t.id === activeId) ?? ordered[0] ?? null;
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // region → text: mark every span linked to the selected region and bring the
  // first into view. Re-runs when the active text changes so switching tabs
  // re-applies the highlight against the newly rendered HTML.
  React.useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    root
      .querySelectorAll('[data-graph-linked="true"]')
      .forEach((el) => el.removeAttribute('data-graph-linked'));
    if (linkedGraphId == null) return;
    const matches = Array.from(root.querySelectorAll<HTMLElement>('[data-graph-id]')).filter((el) =>
      graphIdsOf(el).includes(linkedGraphId)
    );
    if (matches.length === 0) return;
    matches.forEach((el) => el.setAttribute('data-graph-linked', 'true'));
    matches[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [linkedGraphId, active?.id, active?.content]);

  const handleClick = (event: React.MouseEvent) => {
    const ids = graphIdsOf((event.target as Element).closest('[data-graph-id]'));
    if (ids.length > 0) onSpanActivate(ids[0]);
  };
  const handleMouseOver = (event: React.MouseEvent) => {
    const ids = graphIdsOf((event.target as Element).closest('[data-graph-id]'));
    onSpanHover(ids.length > 0 ? ids[0] : null);
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-card">
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-1">
          {ordered.map((text) => (
            <button
              key={text.id}
              type="button"
              onClick={() => setActiveId(text.id)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                text.id === active?.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {text.type}
              {text.language ? (
                <span className="ml-1.5 font-mono text-[10px] uppercase opacity-70">
                  {text.language}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Hide text panel"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div
        ref={containerRef}
        onClick={handleClick}
        onMouseOver={handleMouseOver}
        onMouseLeave={() => onSpanHover(null)}
        className="viewer-text-panel flex-1 overflow-y-auto px-4 py-3"
      >
        {active ? (
          <ImageTextViewer html={active.content} />
        ) : (
          <p className="text-sm text-muted-foreground">No text recorded for this image.</p>
        )}
      </div>

      <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
        Click a highlighted phrase to find its region on the image.
      </p>
    </aside>
  );
}
