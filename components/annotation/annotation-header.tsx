'use client';

import * as React from 'react';
import { Wrench, Star, Plus, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ViewerAnnotationMode } from '@/types/annotation-viewer';

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
  lightboxControl?: React.ReactNode;
  imageToolsControl?: React.ReactNode;
  isPageInCollection?: boolean;
  onTogglePageCollection?: () => void;
  annotationCollectionCount?: number;
  onCreateAnnotationCollection?: () => void;
  // View mode (Allograph / Text / Both).
  viewMode?: ViewerAnnotationMode;
  onSetViewMode?: (mode: ViewerAnnotationMode) => void;
  hasTexts?: boolean;
}

export function AnnotationHeader({
  unsavedCount = 0,
  selectedAnnotationsCount = 0,
  showUnsavedCount = true,
  onOpenFilterPanel,
  isVisibilityFilterActive = false,
  onOpenSettingsPanel,
  isSettingsActive = false,
  showSettingsButton = true,
  lightboxControl,
  imageToolsControl,
  isPageInCollection = false,
  onTogglePageCollection,
  annotationCollectionCount = 0,
  onCreateAnnotationCollection,
  viewMode = 'allograph',
  onSetViewMode,
  hasTexts = false,
}: AnnotationHeaderProps) {
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
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                View
              </span>
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
            <div className="flex items-center space-x-1">
              <span className="text-sm text-muted-foreground">Unsaved</span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-muted text-sm font-medium text-muted-foreground">
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

        {/* Page-level tools */}
        <div className="flex items-center gap-1">
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

          {lightboxControl}

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
