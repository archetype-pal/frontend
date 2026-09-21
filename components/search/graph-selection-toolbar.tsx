'use client';

import * as React from 'react';
import { ListChecks, Loader2, Pencil, Square, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export interface GraphSelectionToolbarProps {
  selectedCount: number;
  pageCount: number;
  /** Whether every graph on the *current* page is already selected — distinct
   *  from `selectedCount === pageCount`, which can coincidentally match across
   *  different pages since selection persists across pagination. */
  allOnPageSelected: boolean;
  onClearSelection: () => void;
  onSelectAllOnPage: () => void;
  onUnselectAllOnPage: () => void;
  onEditSelected: () => void;
  isHydrating?: boolean;
}

export function GraphSelectionToolbar({
  selectedCount,
  pageCount,
  allOnPageSelected,
  onClearSelection,
  onSelectAllOnPage,
  onUnselectAllOnPage,
  onEditSelected,
  isHydrating = false,
}: GraphSelectionToolbarProps) {
  const t = useTranslations('search');
  const tCommon = useTranslations('common');

  return (
    <div className="sticky top-[var(--site-header-h,0px)] z-20 mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-border/80 bg-background/95 p-2.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {t('selectedCount', { count: selectedCount })}
        </span>

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          disabled={pageCount === 0}
          onClick={allOnPageSelected ? onUnselectAllOnPage : onSelectAllOnPage}
        >
          {allOnPageSelected ? (
            <>
              <Square className="h-3.5 w-3.5" />
              {t('unselectAllOnPage', { count: pageCount })}
            </>
          ) : (
            <>
              <ListChecks className="h-3.5 w-3.5" />
              {t('selectAllOnPage', { count: pageCount })}
            </>
          )}
        </Button>

        {selectedCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={onClearSelection}
          >
            <X className="h-3.5 w-3.5" />
            {t('clearSelection')}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={selectedCount === 0 || isHydrating}
          onClick={onEditSelected}
        >
          {isHydrating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {tCommon('loading')}
            </>
          ) : (
            <>
              <Pencil className="h-3.5 w-3.5" />
              {t('editSelected')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
