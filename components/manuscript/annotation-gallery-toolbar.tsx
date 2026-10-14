'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { PencilLine, Search } from 'lucide-react';

import type { GalleryFilterState, NamedOption } from '@/lib/annotation-gallery-filters';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DensityControl, type ThumbDensity } from '@/components/manuscript/thumb-density';
import {
  GalleryFilterChips,
  GalleryFilterControls,
  type HandOption,
  type StatusCounts,
} from '@/components/manuscript/annotation-gallery-filter-bar';

/** CSS variable carrying the toolbar's height, so anchors can clear it. */
export const GALLERY_TOOLBAR_HEIGHT_VAR = '--gallery-toolbar-h';

/** Scroll margin for an anchor target: below the site header and the toolbar. */
export const GALLERY_SCROLL_MARGIN =
  'scroll-mt-[calc(var(--site-header-h,0px)+var(--gallery-toolbar-h,0px)+0.75rem)]';

interface GalleryToolbarProps {
  filters: GalleryFilterState;
  onFiltersChange: (next: GalleryFilterState) => void;
  onClearAllFilters: () => void;
  handOptions: HandOption[];
  featureOptions: NamedOption[];
  positionOptions: NamedOption[];
  statusCounts: StatusCounts;
  handLabel: (key: number | null) => string;
  featureLabel: (id: number) => string;
  positionLabel: (id: number) => string;
  filterInputRef: React.RefObject<HTMLInputElement | null>;
  shownGraphs: number;
  totalGraphs: number;
  shownAllographs: number;
  density: ThumbDensity;
  onDensityChange: (value: ThumbDensity) => void;
  canEdit: boolean;
  /** False when the hand or allograph names failed to load, which editing needs. */
  editingAvailable: boolean;
  annotatingMode: boolean;
  onAnnotatingModeChange: (value: boolean) => void;
}

// One fixed-size toolbar: the controls on top, and a summary line under them
// that always says what is shown and which filters are on. It pins below the
// site header and publishes its own height, so anchor jumps land below it.
export function GalleryToolbar({
  filters,
  onFiltersChange,
  onClearAllFilters,
  handOptions,
  featureOptions,
  positionOptions,
  statusCounts,
  handLabel,
  featureLabel,
  positionLabel,
  filterInputRef,
  shownGraphs,
  totalGraphs,
  shownAllographs,
  density,
  onDensityChange,
  canEdit,
  editingAvailable,
  annotatingMode,
  onAnnotatingModeChange,
}: GalleryToolbarProps) {
  const t = useTranslations('manuscript.gallery');
  const tCommon = useTranslations('common');
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const root = document.documentElement;
    const publish = () =>
      root.style.setProperty(GALLERY_TOOLBAR_HEIGHT_VAR, `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty(GALLERY_TOOLBAR_HEIGHT_VAR);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="sticky top-[var(--site-header-h,0px)] z-30 -mx-1 bg-background/95 px-1 pb-1 pt-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/85"
    >
      <div
        className={cn(
          'rounded-lg border bg-card px-3 py-2.5 shadow-sm transition-colors',
          annotatingMode && 'border-primary'
        )}
      >
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <div className="relative flex min-w-[13rem] max-w-xs flex-1 items-center">
            <Search
              className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={filterInputRef}
              type="search"
              placeholder={t('filterPlaceholder')}
              value={filters.allograph}
              onChange={(e) => onFiltersChange({ ...filters, allograph: e.target.value })}
              className="h-9 pl-8 pr-8 text-sm"
              aria-label={t('filterLabel')}
            />
            {!filters.allograph && <Kbd className="pointer-events-none absolute right-2.5">/</Kbd>}
          </div>

          <GalleryFilterControls
            filters={filters}
            onChange={onFiltersChange}
            handOptions={handOptions}
            featureOptions={featureOptions}
            positionOptions={positionOptions}
            statusCounts={statusCounts}
          />

          <DensityControl density={density} onChange={onDensityChange} />

          {canEdit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <label
                  className={cn(
                    'ml-auto flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm font-medium transition',
                    !editingAvailable
                      ? 'cursor-not-allowed border-dashed text-muted-foreground'
                      : annotatingMode
                        ? 'cursor-pointer border-primary bg-primary/10 text-foreground'
                        : 'cursor-pointer border-transparent text-foreground hover:border-border'
                  )}
                >
                  <Switch
                    checked={annotatingMode}
                    onCheckedChange={onAnnotatingModeChange}
                    disabled={!editingAvailable}
                    aria-label={tCommon('editingMode')}
                  />
                  {tCommon('editingMode')}
                  <Kbd>A</Kbd>
                </label>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {editingAvailable ? t('editingModeTooltip') : t('editingUnavailable')}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="mt-2 flex min-h-7 flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-muted-foreground">
          <span aria-live="polite">
            {t.rich('summary', {
              shown: shownGraphs,
              total: totalGraphs,
              groups: shownAllographs,
              b: (chunks) => <b className="font-semibold tabular-nums text-foreground">{chunks}</b>,
            })}
          </span>
          <GalleryFilterChips
            filters={filters}
            onChange={onFiltersChange}
            onClearAll={onClearAllFilters}
            handLabel={handLabel}
            featureLabel={featureLabel}
            positionLabel={positionLabel}
          />
          {annotatingMode && (
            <span className="ml-auto inline-flex items-center gap-1.5 font-medium text-primary">
              <PencilLine className="h-3.5 w-3.5" aria-hidden />
              {t('editingHint')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Tiny inline keyboard-shortcut chip; styled like the GitHub/Linear pattern.
function Kbd({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <kbd
      aria-hidden
      className={cn(
        'inline-flex h-4 min-w-4 items-center justify-center rounded border bg-muted px-1 font-sans text-[10px] font-medium text-muted-foreground',
        className
      )}
    >
      {children}
    </kbd>
  );
}
