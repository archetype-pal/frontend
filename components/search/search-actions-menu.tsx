'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { Bookmark, Check, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SavedSearchesPanel } from '@/components/search/saved-searches';
import { type ResultType } from '@/lib/search-types';

export type ViewMode = 'table' | 'grid' | 'timeline' | 'distribution' | 'map';

export type SearchActionsMenuProps = {
  triggerId?: string;
  keyword: string;
  filterCount: number;
  resultCount: number;
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
  showGridToggle: boolean;
  showTimelineToggle: boolean;
  showDistributionToggle: boolean;
  showMapToggle: boolean;
  hasTimelineData: boolean;
  distributionEnabled: boolean;
  advancedEnabled: boolean;
  onToggleAdvanced: () => void;
  handleExport: (format: 'csv' | 'json' | 'bibtex', scope: 'page' | 'all') => Promise<void>;
  handleFormattedExport: (format: 'csv' | 'json', scope: 'page' | 'all') => Promise<void>;
  exportBusy: boolean;
  resultType: ResultType;
  isResearcher: boolean;
};

export function SearchActionsMenu({
  triggerId,
  keyword,
  filterCount,
  resultCount,
  viewMode,
  setViewMode,
  showGridToggle,
  showTimelineToggle,
  showDistributionToggle,
  showMapToggle,
  hasTimelineData,
  distributionEnabled,
  advancedEnabled,
  onToggleAdvanced,
  handleExport,
  handleFormattedExport,
  exportBusy,
  resultType,
  isResearcher,
}: SearchActionsMenuProps) {
  const t = useTranslations('search');
  const tCommon = useTranslations('common');
  const [menuOpen, setMenuOpen] = React.useState(false);

  const viewItem = (mode: ViewMode, label: string, disabled?: boolean) => (
    <DropdownMenuItem
      disabled={disabled}
      onClick={() => setViewMode(mode)}
      className="flex items-center gap-2"
    >
      {viewMode === mode ? (
        <Check className="h-4 w-4 shrink-0" />
      ) : (
        <span className="w-4 shrink-0" />
      )}
      {label}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          id={triggerId}
          variant="outline"
          size="sm"
          className="h-11 min-h-11 min-w-11 shrink-0 gap-1.5 px-2.5 sm:h-9 sm:min-h-9 sm:min-w-0 sm:px-3"
          title={t('actionsTitle')}
          aria-label={t('actionsLabel')}
        >
          <MoreVertical className="h-4 w-4 shrink-0" />
          <span className="hidden text-sm sm:inline">{t('actions')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Bookmark className="mr-2 h-4 w-4" />
            {t('savedSearches')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-80 p-0" sideOffset={6}>
            <SavedSearchesPanel
              resultType={resultType}
              keyword={keyword}
              filterCount={filterCount}
              resultCount={resultCount}
              onNavigate={() => setMenuOpen(false)}
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {/* View lives in the visible header view-switcher on sm+; this menu
            section is the small-screen fallback only. */}
        <div className="sm:hidden">
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t('view')}</DropdownMenuLabel>
          {viewItem('table', t('viewTable'))}
          {showGridToggle && viewItem('grid', t('viewGrid'))}
          {showTimelineToggle && viewItem('timeline', t('viewTimeline'), !hasTimelineData)}
          {showDistributionToggle && viewItem('distribution', t('viewCharts'), !distributionEnabled)}
          {showMapToggle && viewItem('map', t('viewMap'))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={advancedEnabled}
          onCheckedChange={() => onToggleAdvanced()}
          onSelect={(e) => e.preventDefault()}
        >
          {t('advancedSearch')}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={exportBusy}>{tCommon('export')}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              disabled={exportBusy}
              onClick={() => void handleExport('csv', 'page')}
            >
              {t('exportPageCsv')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={exportBusy} onClick={() => void handleExport('csv', 'all')}>
              {t('exportAllCsv')}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={exportBusy}
              onClick={() => void handleExport('json', 'page')}
            >
              {t('exportPageJson')}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={exportBusy}
              onClick={() => void handleExport('json', 'all')}
            >
              {t('exportAllJson')}
            </DropdownMenuItem>
            {(resultType === 'manuscripts' ||
              resultType === 'scribes' ||
              resultType === 'hands') && (
              <DropdownMenuItem
                disabled={exportBusy}
                onClick={() => void handleExport('bibtex', 'all')}
              >
                {t('exportAllBibtex')}
              </DropdownMenuItem>
            )}
            {isResearcher && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {t('visibleColumnsOnly')}
                </DropdownMenuLabel>
                <DropdownMenuItem
                  disabled={exportBusy}
                  onClick={() => void handleFormattedExport('csv', 'page')}
                >
                  {t('exportPageFormattedCsv')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={exportBusy}
                  onClick={() => void handleFormattedExport('csv', 'all')}
                >
                  {t('exportAllFormattedCsv')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={exportBusy}
                  onClick={() => void handleFormattedExport('json', 'all')}
                >
                  {t('exportAllFormattedJson')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
