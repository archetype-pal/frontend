'use client';

import * as React from 'react';
import { Wrench, Star, Plus, Eye, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import type { HandType } from '@/types/hands';
import type { Allograph } from '@/types/allographs';
import type { TextDisplayMode, ViewerAnnotationMode } from '@/types/annotation-viewer';

/** Compact radiogroup segmented control (scriptorial active = primary). */
function Segmented<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: T;
  options: Array<{ value: T; label: string; disabled?: boolean; title?: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface AnnotationHeaderProps {
  annotationsEnabled: boolean;
  onToggleAnnotations: () => void;
  unsavedCount: number;
  selectedAnnotationsCount?: number;
  showUnsavedCount?: boolean;
  onAllographSelect: (allograph: Allograph | undefined) => void;
  onHandSelect: (hand: HandType | null) => void;
  allographs: Allograph[];
  hands: HandType[];
  onAllographHover?: (allograph: Allograph | undefined) => void;
  activeAllographCount?: number;
  activeAllographLabel?: string;
  onOpenAllographModal?: () => void;
  selectedAllographId?: number | null;
  selectedHandId?: number | null;
  onOpenFilterPanel?: () => void;
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
  // View mode + text display (dual-annotation views).
  viewMode?: ViewerAnnotationMode;
  onSetViewMode?: (mode: ViewerAnnotationMode) => void;
  hasTexts?: boolean;
  hasTranscription?: boolean;
  hasTranslation?: boolean;
  textDisplayMode?: TextDisplayMode;
  onSetTextDisplayMode?: (mode: TextDisplayMode) => void;
}

export function AnnotationHeader({
  annotationsEnabled,
  onToggleAnnotations,
  unsavedCount = 0,
  selectedAnnotationsCount = 0,
  showUnsavedCount = true,
  onAllographSelect,
  onHandSelect,
  allographs,
  hands,
  onAllographHover,
  activeAllographCount,
  activeAllographLabel,
  onOpenAllographModal,
  selectedAllographId,
  selectedHandId,
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
  hasTranscription = false,
  hasTranslation = false,
  textDisplayMode = 'transcription',
  onSetTextDisplayMode,
}: AnnotationHeaderProps) {
  const [selectedAllograph, setSelectedAllograph] = React.useState<string>('');

  React.useEffect(() => {
    setSelectedAllograph(selectedAllographId != null ? selectedAllographId.toString() : '');
  }, [selectedAllographId]);

  React.useEffect(() => {
    if (!selectedAllograph) return;
    const exists = allographs.some((a) => a.id.toString() === selectedAllograph);
    if (!exists) {
      setSelectedAllograph('');
      onAllographSelect(undefined);
      onAllographHover?.(undefined);
    }
  }, [allographs, selectedAllograph, onAllographSelect, onAllographHover]);

  const handleAllographChange = (allographId: string) => {
    onAllographHover?.(undefined);

    if (allographId === '__all__') {
      setSelectedAllograph('');
      onAllographSelect(undefined);
      return;
    }

    setSelectedAllograph(allographId);
    const selectedAllographData = allographs.find((a) => a.id.toString() === allographId);
    onAllographSelect(selectedAllographData);
  };

  const handleAllographHover = (allographId: string) => {
    const a = allographs.find((x) => x.id.toString() === allographId);
    onAllographHover?.(a);
  };

  const handleHandChange = (handId: string) => {
    if (handId === '__unset__') {
      onHandSelect(null);
      return;
    }

    const selectedHandData = hands.find((h) => h.id.toString() === handId);
    onHandSelect(selectedHandData ?? null);
  };

  const pageCollectionLabel = isPageInCollection
    ? 'Remove page from collection'
    : 'Add page to collection';
  const canCreateAnnotationCollection =
    Boolean(onCreateAnnotationCollection) && annotationCollectionCount > 0;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center justify-between gap-y-2 border-b border-border bg-card px-4 py-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
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

          {onSetTextDisplayMode && viewMode !== 'allograph' && hasTexts ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Show
              </span>
              <Segmented
                ariaLabel="Transcription and translation display"
                value={textDisplayMode}
                onChange={onSetTextDisplayMode}
                options={[
                  {
                    value: 'transcription',
                    label: 'Transcription',
                    disabled: !hasTranscription,
                  },
                  { value: 'translation', label: 'Translation', disabled: !hasTranslation },
                  {
                    value: 'both',
                    label: 'Both',
                    disabled: !hasTranscription || !hasTranslation,
                  },
                ]}
              />
            </div>
          ) : null}

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-foreground">Annotations</span>
            <div className="flex">
              <button
                onClick={onToggleAnnotations}
                type="button"
                aria-pressed={annotationsEnabled}
                aria-label={annotationsEnabled ? 'Annotations on' : 'Annotations off'}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-semibold transition-colors',
                  annotationsEnabled
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'border border-border bg-background text-foreground shadow-sm hover:bg-secondary'
                )}
              >
                {annotationsEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
          {onOpenFilterPanel && (
            <Button
              variant={isVisibilityFilterActive ? 'default' : 'outline'}
              className="h-8 px-3 flex items-center gap-2"
              onClick={() => onOpenFilterPanel()}
              type="button"
              aria-pressed={isVisibilityFilterActive}
            >
              <Filter className="h-4 w-4" />
              <span className="text-sm">Filter Annotations</span>
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

          <div className="flex items-center space-x-1">
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
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {imageToolsControl}
          <Select
            value={selectedHandId != null ? selectedHandId.toString() : '__unset__'}
            onValueChange={handleHandChange}
          >
            <SelectTrigger className="w-full sm:w-[220px]" disabled={!hands.length}>
              <SelectValue placeholder="Choose a hand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unset__">Choose a hand</SelectItem>
              {hands.map((hand) => (
                <SelectItem key={hand.id} value={hand.id.toString()}>
                  {hand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="w-full sm:w-[200px]">
            <SearchableSelect
              options={allographs.map((allograph) => ({
                value: allograph.id.toString(),
                label: formatAllographLabel(allograph),
              }))}
              value={selectedAllograph || null}
              onValueChange={(value) => handleAllographChange(value ?? '__all__')}
              onOptionHover={(value) => {
                if (!value) {
                  onAllographHover?.(undefined);
                  return;
                }
                handleAllographHover(value);
              }}
              placeholder="Select Allograph"
              searchPlaceholder="Search allographs..."
              emptyText="No allographs found."
              clearLabel="All allographs"
              triggerClassName="w-full"
              contentClassName="z-[250]"
            />
          </div>

          <Button
            variant="outline"
            className="h-8 px-2 flex items-center gap-2"
            onClick={() => onOpenAllographModal?.()}
            disabled={!activeAllographLabel}
            title={
              activeAllographLabel
                ? `${activeAllographLabel}: ${activeAllographCount ?? 0}`
                : 'Select an allograph first'
            }
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{activeAllographCount ?? 0}</span>
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
