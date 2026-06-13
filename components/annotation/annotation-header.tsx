'use client';

import * as React from 'react';
import { Eye, Plus, Star, Wrench, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatAllographLabel } from '@/lib/allograph-labels';
import { cn } from '@/lib/utils';
import type { Allograph } from '@/types/allographs';
import type { ViewerAnnotationMode } from '@/types/annotation-viewer';
import type { HandType } from '@/types/hands';

interface AnnotationHeaderProps {
  unsavedCount: number;
  selectedAnnotationsCount?: number;
  showUnsavedCount?: boolean;
  /** Opens the Annotations panel (single home for visibility + allograph/hand). */
  onOpenFilterPanel?: () => void;
  /** Highlights the Annotations button when annotations are hidden or filtered. */
  isVisibilityFilterActive?: boolean;
  onOpenSettingsPanel?: () => void;
  isSettingsActive?: boolean;
  showSettingsButton?: boolean;
  imageToolsControl?: React.ReactNode;
  isPageInCollection?: boolean;
  onTogglePageCollection?: () => void;
  annotationCollectionCount?: number;
  onCreateAnnotationCollection?: () => void;
  // View mode (Allograph / Text / Both).
  viewMode?: ViewerAnnotationMode;
  onSetViewMode?: (mode: ViewerAnnotationMode) => void;
  hasTexts?: boolean;
  // Active hand for new annotations. Read-only when the image has a single hand.
  hands?: HandType[];
  selectedHandId?: number | null;
  onHandSelect?: (hand: HandType | null) => void;
  // Active allograph for gallery/highlighting and new annotation defaults.
  allographs?: Allograph[];
  selectedAllographId?: number | null;
  onAllographSelect?: (allograph: Allograph | undefined) => void;
  onAllographHover?: (allograph: Allograph | undefined) => void;
  activeAllographCount?: number;
  activeAllographLabel?: string;
  onOpenAllographModal?: () => void;
}

const UNSET_HAND = '__unset__';

export function AnnotationHeader({
  unsavedCount = 0,
  selectedAnnotationsCount = 0,
  showUnsavedCount = true,
  onOpenFilterPanel,
  isVisibilityFilterActive = false,
  onOpenSettingsPanel,
  isSettingsActive = false,
  showSettingsButton = true,
  imageToolsControl,
  isPageInCollection = false,
  onTogglePageCollection,
  annotationCollectionCount = 0,
  onCreateAnnotationCollection,
  viewMode = 'allograph',
  onSetViewMode,
  hasTexts = false,
  hands = [],
  selectedHandId,
  onHandSelect,
  allographs = [],
  selectedAllographId,
  onAllographSelect,
  onAllographHover,
  activeAllographCount,
  activeAllographLabel,
  onOpenAllographModal,
}: AnnotationHeaderProps) {
  const singleHand = hands.length === 1 ? hands[0] : null;
  const showAllographControls = viewMode !== 'text';
  const pageCollectionLabel = isPageInCollection
    ? 'Remove page from collection'
    : 'Add page to collection';
  const canCreateAnnotationCollection =
    Boolean(onCreateAnnotationCollection) && annotationCollectionCount > 0;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-card px-4 py-2">
        {/* What you're viewing + the one annotations control */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {onSetViewMode ? (
            <div className="flex items-center gap-1.5">
              <Segmented
                ariaLabel="Annotation view"
                value={viewMode}
                onChange={onSetViewMode}
                options={[
                  { value: 'allograph', label: 'Allograph' },
                  {
                    value: 'text',
                    label: 'Text',
                    disabled: !hasTexts,
                    title: hasTexts ? undefined : 'No text recorded for this image',
                  },
                  {
                    value: 'both',
                    label: 'Both',
                    disabled: !hasTexts,
                    title: hasTexts ? undefined : 'No text recorded for this image',
                  },
                ]}
              />
            </div>
          ) : null}

          {onOpenFilterPanel && (
            <Button
              variant={isVisibilityFilterActive ? 'default' : 'outline'}
              className="flex h-8 items-center gap-2 px-3"
              onClick={() => onOpenFilterPanel()}
              type="button"
              aria-pressed={isVisibilityFilterActive}
              title="Show, hide and filter annotations"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-sm">Annotations</span>
            </Button>
          )}

          {showUnsavedCount && (
            <div className="flex items-center space-x-1" role="status" aria-live="polite">
              <span
                className={cn(
                  'text-sm',
                  unsavedCount > 0 ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                Unsaved
              </span>
              <span
                className={cn(
                  'inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-sm font-medium',
                  // Unsaved work reads as caution (amber, matching the draft idiom);
                  // a zero count stays muted so it recedes.
                  unsavedCount > 0
                    ? 'bg-amber-400/20 text-amber-700 dark:text-amber-300'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {unsavedCount}
              </span>
            </div>
          )}
          {selectedAnnotationsCount > 0 && (
            <div className="flex items-center space-x-1">
              <span className="text-sm text-muted-foreground">Selected</span>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-primary/10 px-1.5 text-sm font-medium text-primary">
                {selectedAnnotationsCount}
              </span>
            </div>
          )}
        </div>

        {/* Active hand + page-level tools */}
        <div className="flex items-center gap-x-3 gap-y-2">
          {hands.length > 0 && (
            <div className="flex items-center gap-1.5">
              {singleHand ? (
                <span
                  className="inline-flex h-8 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground"
                  title="The only hand recorded for this image"
                >
                  {singleHand.name}
                </span>
              ) : (
                <Select
                  value={selectedHandId != null ? selectedHandId.toString() : UNSET_HAND}
                  onValueChange={(value) => {
                    if (value === UNSET_HAND) onHandSelect?.(null);
                    else onHandSelect?.(hands.find((h) => h.id.toString() === value) ?? null);
                  }}
                >
                  <SelectTrigger className="h-8 w-[200px]">
                    <SelectValue placeholder="Any hand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSET_HAND}>Any hand</SelectItem>
                    {hands.map((hand) => (
                      <SelectItem key={hand.id} value={hand.id.toString()}>
                        {hand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {showAllographControls && allographs.length > 0 && onAllographSelect && (
            <div className="flex items-center gap-1.5">
              <SearchableSelect
                options={allographs.map((a) => ({
                  value: a.id.toString(),
                  label: formatAllographLabel(a),
                }))}
                value={selectedAllographId != null ? selectedAllographId.toString() : null}
                onValueChange={(value) =>
                  onAllographSelect(
                    value ? allographs.find((a) => a.id.toString() === value) : undefined
                  )
                }
                onOptionHover={(value) =>
                  onAllographHover?.(
                    value ? allographs.find((a) => a.id.toString() === value) : undefined
                  )
                }
                placeholder="Any allograph"
                searchPlaceholder="Search allographs…"
                emptyText="No allographs found."
                clearLabel="Any allograph"
                triggerClassName="h-8 w-[200px]"
                contentClassName="z-[250]"
              />
            </div>
          )}

          {showAllographControls && onOpenAllographModal && (
            <Button
              variant="outline"
              className="flex h-8 items-center gap-2 px-2"
              onClick={onOpenAllographModal}
              disabled={!activeAllographLabel}
              aria-label={
                activeAllographLabel
                  ? `View ${activeAllographLabel} annotation thumbnails`
                  : 'Select an allograph first'
              }
              title={
                activeAllographLabel
                  ? `${activeAllographLabel}: ${activeAllographCount ?? 0}`
                  : 'Select an allograph first'
              }
              type="button"
            >
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{activeAllographCount ?? 0}</span>
            </Button>
          )}

          {imageToolsControl}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={onTogglePageCollection}
                disabled={!onTogglePageCollection}
                aria-label={pageCollectionLabel}
                aria-pressed={isPageInCollection}
                title={pageCollectionLabel}
                type="button"
              >
                <Star
                  className={cn('h-4 w-4', isPageInCollection && 'fill-amber-400 text-amber-400')}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{pageCollectionLabel}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative h-8 w-8"
                onClick={onCreateAnnotationCollection}
                disabled={!canCreateAnnotationCollection}
                aria-label="Create a new Collection containing all of the annotations on this page"
                title="Create a new Collection containing all of the annotations on this page"
                type="button"
              >
                <Star className="h-4 w-4" />
                <Plus className="absolute -right-1 -top-1 h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Create a new Collection containing all of the annotations on this page
            </TooltipContent>
          </Tooltip>

          {showSettingsButton && (
            <Button
              variant={isSettingsActive ? 'default' : 'outline'}
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenSettingsPanel?.()}
              type="button"
              title="Settings"
              aria-label="Settings"
              aria-pressed={isSettingsActive}
            >
              <Wrench className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
