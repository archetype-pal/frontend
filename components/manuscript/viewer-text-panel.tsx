'use client';

import * as React from 'react';
import { Download, X } from 'lucide-react';

import { ImageTextViewer } from '@/components/text/image-text-viewer';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/api-fetch';
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
  /** Track A — whether the current user may author text↔region links. */
  canLink?: boolean;
  /** Element index currently armed for linking (drives the highlight). */
  armedElementIndex?: number | null;
  /** Arm linking: clicking an unlinked phrase asks the user to draw its region. */
  onArmLink?: (textId: number, elementIndex: number, label: string) => void;
  /** Cancel an armed link. */
  onCancelLink?: () => void;
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
  canLink = false,
  armedElementIndex = null,
  onArmLink,
  onCancelLink,
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

  // Mark the armed element so the editor sees which phrase they're linking.
  React.useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    root
      .querySelectorAll('[data-graph-arming="true"]')
      .forEach((el) => el.removeAttribute('data-graph-arming'));
    if (armedElementIndex == null) return;
    const el = root.querySelectorAll<HTMLElement>('[data-dpt]')[armedElementIndex];
    if (el) {
      el.setAttribute('data-graph-arming', 'true');
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [armedElementIndex, active?.id, active?.content]);

  const handleClick = (event: React.MouseEvent) => {
    const target = event.target as Element;
    // Decide based on the *innermost* linkable element the user clicked.
    const innermost = target.closest<HTMLElement>('[data-dpt]');
    const ownIds = graphIdsOf(innermost);
    if (ownIds.length > 0) {
      onSpanActivate(ownIds[0]); // this element is itself linked → show its region
      return;
    }
    // Innermost element is unlinked + author capability → arm linking for it.
    if (canLink && onArmLink && active && innermost && containerRef.current) {
      const all = Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-dpt]'));
      const index = all.indexOf(innermost);
      if (index >= 0) {
        onArmLink(active.id, index, (innermost.textContent ?? '').trim().slice(0, 40));
        return;
      }
    }
    // Otherwise fall back to the nearest linked ancestor (read-only navigation).
    const ancestorIds = graphIdsOf(target.closest('[data-graph-id]'));
    if (ancestorIds.length > 0) onSpanActivate(ancestorIds[0]);
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
        <div className="flex items-center gap-1">
          {active ? (
            <a
              href={`${API_BASE_URL}/api/v1/manuscripts/image-texts/${active.id}/tei/`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={`Download ${active.type} as TEI`}
            >
              <Download className="h-4 w-4" />
            </a>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Hide text panel"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
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

      {armedElementIndex != null ? (
        <div className="flex items-center justify-between gap-2 border-t bg-primary/5 px-3 py-1.5 text-[11px]">
          <span className="text-primary">
            Draw the region for this phrase on the image to link it.
          </span>
          <button
            type="button"
            onClick={() => onCancelLink?.()}
            className="rounded px-1.5 py-0.5 font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          {canLink
            ? 'Click a highlighted phrase to find its region; click an un-highlighted phrase to draw and link a new region.'
            : 'Click a highlighted phrase to find its region on the image.'}
        </p>
      )}
    </aside>
  );
}
