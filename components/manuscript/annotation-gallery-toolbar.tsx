'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { PencilLine, Search } from 'lucide-react';

import type { GalleryFilterState } from '@/lib/annotation-gallery-filters';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DensityControl, type ThumbDensity } from '@/components/manuscript/thumb-density';
import {
  GalleryFilterChips,
  GalleryFilterControls,
  type FilterOptions,
  type StatusCounts,
  TOOLBAR_SEGMENTED,
} from '@/components/manuscript/annotation-gallery-filter-bar';

/** CSS variable carrying the toolbar's height, so anchors can clear it. */
export const GALLERY_TOOLBAR_HEIGHT_VAR = '--gallery-toolbar-h';

/** Scroll margin for an anchor target: below the site header and the toolbar. */
export const GALLERY_SCROLL_MARGIN =
  'scroll-mt-[calc(var(--site-header-h,0px)+var(--gallery-toolbar-h,0px)+0.75rem)]';

interface GalleryToolbarProps {
  filters: GalleryFilterState;
  onFiltersChange: (next: GalleryFilterState) => void;
  options: FilterOptions;
  statusCounts: StatusCounts;
  filterInputRef: React.RefObject<HTMLInputElement | null>;
  /** For the summary line: graphs shown, graphs on the image, allograph rows shown. */
  summary: { shown: number; total: number; groups: number };
  density: ThumbDensity;
  onDensityChange: (value: ThumbDensity) => void;
  /** Staff only. `available` is false when the hand or allograph names failed
   *  to load, which editing needs. */
  editing?: { on: boolean; available: boolean; onChange: (on: boolean) => void };
}

// One fixed-size toolbar: the controls on top, and a summary line under them
// that always says what is shown and which filters are on. From the sm
// breakpoint up it pins below the site header and publishes its own height,
// so anchor jumps land below it.
export function GalleryToolbar({
  filters,
  onFiltersChange,
  options,
  statusCounts,
  filterInputRef,
  summary,
  density,
  onDensityChange,
  editing,
}: GalleryToolbarProps) {
  const t = useTranslations('manuscript.gallery');
  const tCommon = useTranslations('common');
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const root = document.documentElement;
    // On phones the toolbar scrolls away (pinned, it would cover a third of
    // the screen), so it only takes room above an anchor while it is pinned.
    const publish = () => {
      const pinned = getComputedStyle(el).position === 'sticky';
      root.style.setProperty(GALLERY_TOOLBAR_HEIGHT_VAR, pinned ? `${el.offsetHeight}px` : '0px');
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    // Crossing the breakpoint can pin or unpin it without a size change.
    window.addEventListener('resize', publish);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', publish);
      root.style.removeProperty(GALLERY_TOOLBAR_HEIGHT_VAR);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative z-30 sm:sticky sm:top-[var(--site-header-h,0px)] -mx-1 bg-background/95 px-1 pb-1 pt-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/85"
    >
      <div
        className={cn(
          'rounded-lg border bg-card px-3 py-2.5 shadow-sm transition-colors',
          editing?.on && 'border-primary'
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
            options={options}
            statusCounts={statusCounts}
          />

          <DensityControl
            density={density}
            onChange={onDensityChange}
            className={TOOLBAR_SEGMENTED}
          />

          {editing && (
            <Tooltip>
              <TooltipTrigger asChild>
                <label
                  className={cn(
                    'ml-auto flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm font-medium transition',
                    !editing.available
                      ? 'cursor-not-allowed border-dashed text-muted-foreground'
                      : editing.on
                        ? 'cursor-pointer border-primary bg-primary/10 text-foreground'
                        : 'cursor-pointer border-transparent text-foreground hover:border-border'
                  )}
                >
                  <Switch
                    checked={editing.on}
                    onCheckedChange={editing.onChange}
                    disabled={!editing.available}
                    aria-label={tCommon('editingMode')}
                  />
                  {tCommon('editingMode')}
                  <Kbd>A</Kbd>
                </label>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {editing.available ? t('editingModeTooltip') : t('editingUnavailable')}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="mt-2 flex min-h-7 flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-muted-foreground">
          <span aria-live="polite">
            {t.rich('summary', {
              ...summary,
              b: (chunks) => <b className="font-semibold tabular-nums text-foreground">{chunks}</b>,
            })}
          </span>
          <GalleryFilterChips filters={filters} onChange={onFiltersChange} options={options} />
          {editing?.on && (
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
