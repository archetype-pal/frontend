'use client';

import * as React from 'react';
import { Eye, EyeOff, Plus, Star, Wrench, SlidersHorizontal } from 'lucide-react';
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
import { useTranslations } from 'next-intl';
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
  /** Highlights the filter icon when an allograph/hand/editorial filter is narrowing the view. */
  isVisibilityFilterActive?: boolean;
  /** Master "annotations visible" state — drives the eye toggle in the Annotations control. */
  annotationsEnabled?: boolean;
  /** Toggles every annotation/graph on the image on or off in one click. */
  onToggleAnnotations?: () => void;
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
  annotationsEnabled = true,
  onToggleAnnotations,
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
  const t = useTranslations('annotation');
  const singleHand = hands.length === 1 ? hands[0] : null;
  const showAllographControls = viewMode !== 'text';
  const pageCollectionLabel = isPageInCollection
    ? t('header.pageRemoveFromCollection')
    : t('header.pageAddToCollection');
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
                ariaLabel={t('header.viewMode')}
                value={viewMode}
                onChange={onSetViewMode}
                options={[
                  { value: 'allograph', label: t('header.viewAllograph') },
                  {
                    value: 'text',
                    label: t('header.viewText'),
                    disabled: !hasTexts,
                    title: hasTexts ? undefined : t('header.noTextRecorded'),
                  },
                  {
                    value: 'both',
                    label: t('header.viewBoth'),
                    disabled: !hasTexts,
                    title: hasTexts ? undefined : t('header.noTextRecorded'),
                  },
                ]}
              />
            </div>
          ) : null}

          {(onOpenFilterPanel || onToggleAnnotations) && (
            <div
              className={cn(
                'inline-flex h-8 items-center overflow-hidden rounded-md border border-border bg-card',
                !annotationsEnabled && 'border-amber-400/60'
              )}
            >
              <span className="select-none pl-3 pr-2 text-sm font-medium text-foreground">
                {t('header.annotations')}
              </span>

              {onOpenFilterPanel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onOpenFilterPanel()}
                      aria-pressed={isVisibilityFilterActive}
                      aria-label={t('header.filterAnnotations')}
                      className={cn(
                        'flex h-full w-8 items-center justify-center border-l border-border transition-colors',
                        isVisibilityFilterActive
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t('header.filterAnnotationsTooltip')}</TooltipContent>
                </Tooltip>
              )}

              {onToggleAnnotations && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onToggleAnnotations()}
                      aria-pressed={!annotationsEnabled}
                      aria-label={
                        annotationsEnabled
                          ? t('header.hideAllAnnotations')
                          : t('header.showAllAnnotations')
                      }
                      className={cn(
                        'flex h-full w-8 items-center justify-center border-l border-border transition-colors',
                        annotationsEnabled
                          ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          : 'bg-amber-400/20 text-amber-700 hover:bg-amber-400/30 dark:text-amber-300'
                      )}
                    >
                      {annotationsEnabled ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {annotationsEnabled
                      ? t('header.hideAllAnnotations')
                      : t('header.showAllAnnotations')}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {showUnsavedCount && (
            <div className="flex items-center space-x-1" role="status" aria-live="polite">
              <span
                className={cn(
                  'text-sm',
                  unsavedCount > 0 ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {t('header.unsaved')}
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
              <span className="text-sm text-muted-foreground">{t('header.selected')}</span>
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
                  title={t('header.singleHandTitle')}
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
                    <SelectValue placeholder={t('header.anyHand')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSET_HAND}>{t('header.anyHand')}</SelectItem>
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
                placeholder={t('header.anyAllograph')}
                searchPlaceholder={t('header.searchAllographs')}
                emptyText={t('header.noAllographsFound')}
                clearLabel={t('header.anyAllograph')}
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
                  ? t('header.viewAllographThumbnails', { label: activeAllographLabel })
                  : t('header.selectAllographFirst')
              }
              title={
                activeAllographLabel
                  ? `${activeAllographLabel}: ${activeAllographCount ?? 0}`
                  : t('header.selectAllographFirst')
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
                aria-label={t('header.createAnnotationCollection')}
                title={t('header.createAnnotationCollection')}
                type="button"
              >
                <Star className="h-4 w-4" />
                <Plus className="absolute -right-1 -top-1 h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('header.createAnnotationCollection')}</TooltipContent>
          </Tooltip>

          {showSettingsButton && (
            <Button
              variant={isSettingsActive ? 'default' : 'outline'}
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenSettingsPanel?.()}
              type="button"
              title={t('header.settings')}
              aria-label={t('header.settings')}
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
