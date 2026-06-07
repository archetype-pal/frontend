'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { ResizeHandle } from '@/components/ui/resize-handle';
import { Separator } from '@/components/ui/separator';
import { PanelHeader } from './panel-header';
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

/**
 * One visibility/focus list (Allographs or Hands): a header with "Toggle All",
 * then per-item rows of a visibility checkbox + a focus button. `onHover` and
 * `activeId` are optional — only the Allographs list highlights/hovers; the
 * Hands list renders the same rows without them. Greyed + non-interactive when
 * `disabled` (the master "Show annotations" switch is off).
 */
function FilterSection<T extends { id: number }>({
  title,
  items,
  selectedIds,
  getLabel,
  onToggleAll,
  onToggleOne,
  onFocus,
  onHover,
  activeId,
  focusTitle,
  emptyText,
  disabled,
}: {
  title: string;
  items: T[];
  selectedIds: number[];
  getLabel: (item: T) => string;
  onToggleAll: () => void;
  onToggleOne: (id: number) => void;
  onFocus?: (item: T) => void;
  onHover?: (item: T | undefined) => void;
  activeId?: number | null;
  focusTitle: string;
  emptyText: string;
  disabled: boolean;
}) {
  return (
    <div className={cn('mt-5', disabled && 'pointer-events-none opacity-50')}>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <Button variant="outline" size="sm" type="button" onClick={onToggleAll}>
          Toggle All
        </Button>
      </div>
      <Separator className="mb-2" />
      <div className="max-h-[220px] space-y-0.5 overflow-auto pr-1">
        {items.length ? (
          items.map((item) => {
            const label = getLabel(item);
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => onToggleOne(item.id)}
                  className={CHECKBOX}
                  aria-label={`Show ${label}`}
                />
                <button
                  type="button"
                  onClick={() => onFocus?.(item)}
                  onMouseEnter={onHover ? () => onHover(item) : undefined}
                  onMouseLeave={onHover ? () => onHover(undefined) : undefined}
                  title={focusTitle}
                  className={cn(
                    'flex-1 text-left text-sm transition-colors',
                    activeId != null && activeId === item.id
                      ? 'font-semibold text-primary'
                      : 'text-foreground hover:text-primary'
                  )}
                >
                  {label}
                </button>
              </div>
            );
          })
        ) : (
          <p className="px-2 text-sm text-muted-foreground">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

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
      <PanelHeader
        title="Annotations"
        closeLabel="Close annotations panel"
        onClose={onClose}
        dragHandleProps={dragHandleProps}
      />

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
        <FilterSection
          title="Allographs"
          items={allographs}
          selectedIds={selectedAllographIds}
          getLabel={formatAllographLabel}
          onToggleAll={onToggleAllAllographs}
          onToggleOne={onToggleAllograph}
          onFocus={onFocusAllograph}
          onHover={onAllographHover}
          activeId={activeAllographId}
          focusTitle="Highlight on image and show examples"
          emptyText="No allographs available."
          disabled={!annotationsEnabled}
        />

        {/* Hands — checkbox toggles visibility; the name highlights that hand */}
        <FilterSection
          title="Hands"
          items={hands}
          selectedIds={selectedHandIds}
          getLabel={(hand) => hand.name}
          onToggleAll={onToggleAllHands}
          onToggleOne={onToggleHand}
          onFocus={onFocusHand}
          focusTitle="Highlight this hand on the image"
          emptyText="No hands available."
          disabled={!annotationsEnabled}
        />
      </div>

      <ResizeHandle {...resizeHandleProps} />
    </div>
  );
}
