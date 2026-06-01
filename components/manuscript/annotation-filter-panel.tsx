'use client';

import * as React from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ResizeHandle } from '@/components/ui/resize-handle';
import { Separator } from '@/components/ui/separator';
import { useOnEscape } from '@/hooks/use-on-escape';
import { formatAllographLabel } from '@/lib/allograph-labels';
import { cn } from '@/lib/utils';
import type { Allograph } from '@/types/allographs';

type FilterOption = {
  id: number;
  name: string;
};

interface AnnotationFilterPanelProps {
  isOpen: boolean;
  transform: string;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  /** Master show/hide for the whole annotation overlay. */
  annotationsEnabled: boolean;
  onToggleAnnotations: () => void;
  allographs: Allograph[];
  hands: FilterOption[];
  selectedAllographIds: number[];
  selectedHandIds: number[];
  showEditorialToggle: boolean;
  showEditorial: boolean;
  showPublicAnnotations: boolean;
  /** Allograph currently focused (highlighted on the image / shown in the gallery). */
  activeAllographId?: number | null;
  onClose: () => void;
  onToggleAllAllographs: () => void;
  onToggleAllHands: () => void;
  onToggleAllograph: (allographId: number) => void;
  onToggleHand: (handId: number) => void;
  onToggleEditorial: () => void;
  onTogglePublicAnnotations: () => void;
  /** Click a letter → highlight its instances on the image + open the gallery. */
  onFocusAllograph?: (allograph: Allograph) => void;
  /** Click a hand → highlight its instances on the image. */
  onFocusHand?: (hand: FilterOption) => void;
  onAllographHover?: (allograph: Allograph | undefined) => void;
  /** Resizable size + corner-grip handlers (from useResizable). */
  width?: number;
  height?: number;
  resizeHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
}

const CHECKBOX = 'h-4 w-4 rounded border-input';

export function AnnotationFilterPanel({
  isOpen,
  transform,
  dragHandleProps,
  annotationsEnabled,
  onToggleAnnotations,
  allographs,
  hands,
  selectedAllographIds,
  selectedHandIds,
  showEditorialToggle,
  showEditorial,
  showPublicAnnotations,
  activeAllographId,
  onClose,
  onToggleAllAllographs,
  onToggleAllHands,
  onToggleAllograph,
  onToggleHand,
  onToggleEditorial,
  onTogglePublicAnnotations,
  onFocusAllograph,
  onFocusHand,
  onAllographHover,
  width,
  height,
  resizeHandleProps,
}: AnnotationFilterPanelProps) {
  useOnEscape(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal={false}
      aria-label="Annotations"
      data-resizable-panel
      className="fixed right-4 top-24 z-40 flex max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border bg-background shadow-lg"
      style={{
        transform,
        width: width ?? 380,
        height,
        maxHeight: height ? undefined : 'calc(100dvh - 7rem)',
      }}
    >
      <div
        className="flex cursor-move select-none items-center justify-between border-b px-4 py-3"
        {...dragHandleProps}
      >
        <h3 className="text-base font-semibold">Annotations</h3>
        <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            type="button"
            aria-label="Close annotations panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
        {/* Master visibility + type filters */}
        <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
          <input
            type="checkbox"
            checked={annotationsEnabled}
            onChange={onToggleAnnotations}
            className={CHECKBOX}
          />
          <span className="text-sm font-medium text-foreground">Show annotations</span>
        </label>

        <div className={cn('mt-1', !annotationsEnabled && 'pointer-events-none opacity-50')}>
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
            <input
              type="checkbox"
              checked={showPublicAnnotations}
              onChange={onTogglePublicAnnotations}
              className={CHECKBOX}
            />
            <span className="text-sm text-foreground">Public</span>
          </label>
          {showEditorialToggle && (
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
              <input
                type="checkbox"
                checked={showEditorial}
                onChange={onToggleEditorial}
                className={CHECKBOX}
              />
              <span className="text-sm text-foreground">Editorial</span>
            </label>
          )}
        </div>

        {/* Allographs — checkbox toggles visibility; the name highlights + opens examples */}
        <div className={cn('mt-5', !annotationsEnabled && 'pointer-events-none opacity-50')}>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Allographs</h4>
            <Button variant="outline" size="sm" type="button" onClick={onToggleAllAllographs}>
              Toggle All
            </Button>
          </div>
          <Separator className="mb-2" />
          <div className="max-h-[220px] space-y-0.5 overflow-auto pr-1">
            {allographs.length ? (
              allographs.map((allograph) => (
                <div
                  key={allograph.id}
                  className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedAllographIds.includes(allograph.id)}
                    onChange={() => onToggleAllograph(allograph.id)}
                    className={CHECKBOX}
                    aria-label={`Show ${formatAllographLabel(allograph)}`}
                  />
                  <button
                    type="button"
                    onClick={() => onFocusAllograph?.(allograph)}
                    onMouseEnter={() => onAllographHover?.(allograph)}
                    onMouseLeave={() => onAllographHover?.(undefined)}
                    title="Highlight on image and show examples"
                    className={cn(
                      'flex-1 text-left text-sm transition-colors',
                      activeAllographId === allograph.id
                        ? 'font-semibold text-primary'
                        : 'text-foreground hover:text-primary'
                    )}
                  >
                    {formatAllographLabel(allograph)}
                  </button>
                </div>
              ))
            ) : (
              <p className="px-2 text-sm text-muted-foreground">No allographs available.</p>
            )}
          </div>
        </div>

        {/* Hands — checkbox toggles visibility; the name highlights that hand */}
        <div className={cn('mt-5', !annotationsEnabled && 'pointer-events-none opacity-50')}>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Hands</h4>
            <Button variant="outline" size="sm" type="button" onClick={onToggleAllHands}>
              Toggle All
            </Button>
          </div>
          <Separator className="mb-2" />
          <div className="max-h-[220px] space-y-0.5 overflow-auto pr-1">
            {hands.length ? (
              hands.map((hand) => (
                <div
                  key={hand.id}
                  className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedHandIds.includes(hand.id)}
                    onChange={() => onToggleHand(hand.id)}
                    className={CHECKBOX}
                    aria-label={`Show ${hand.name}`}
                  />
                  <button
                    type="button"
                    onClick={() => onFocusHand?.(hand)}
                    title="Highlight this hand on the image"
                    className="flex-1 text-left text-sm text-foreground transition-colors hover:text-primary"
                  >
                    {hand.name}
                  </button>
                </div>
              ))
            ) : (
              <p className="px-2 text-sm text-muted-foreground">No hands available.</p>
            )}
          </div>
        </div>
      </div>

      <ResizeHandle {...resizeHandleProps} />
    </div>
  );
}
