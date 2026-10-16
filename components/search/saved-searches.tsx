'use client';

import * as React from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type ResultType } from '@/lib/search-types';
import { resolveResultTypeLabel } from '@/lib/search-label-helpers';
import { useModelLabels } from '@/contexts/model-labels-context';
import {
  type SavedSearch,
  addSavedSearch,
  buildFilterSummary,
  getSavedSearches,
  removeSavedSearch,
} from '@/lib/saved-searches';
import { useTranslations } from 'next-intl';

type SavedSearchesPanelProps = {
  resultType: ResultType;
  keyword: string;
  filterCount: number;
  resultCount: number;
  /** When following a saved link (e.g. close parent dropdown). */
  onNavigate?: () => void;
};

export function SavedSearchesPanel({
  resultType,
  keyword,
  filterCount,
  resultCount,
  onNavigate,
}: SavedSearchesPanelProps) {
  const t = useTranslations('search');
  const tCommon = useTranslations('common');
  const [searches, setSearches] = React.useState<SavedSearch[]>(() => getSavedSearches());
  const [label, setLabel] = React.useState('');
  const { getLabel: getModelLabel } = useModelLabels();

  const handleSave = React.useCallback(() => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const url = window.location.pathname + window.location.search;
    addSavedSearch({
      label: trimmed,
      resultType,
      keyword,
      url,
      filterCount,
      resultCount,
    });
    setSearches(getSavedSearches());
    setLabel('');
  }, [label, resultType, keyword, filterCount, resultCount]);

  const handleRemove = React.useCallback((id: string) => {
    removeSavedSearch(id);
    setSearches(getSavedSearches());
  }, []);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  return (
    <div className="p-0">
      <div className="border-b p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">{t('saveSearchLabel')}</p>
        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder={t('saveSearchPlaceholder')}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0 rounded-md border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button size="sm" onClick={handleSave} disabled={!label.trim()}>
            {tCommon('save')}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          {resolveResultTypeLabel(resultType, getModelLabel)}
          {keyword ? ` · "${keyword}"` : ''}
          {filterCount > 0 ? ` · ${filterCount} filter${filterCount > 1 ? 's' : ''}` : ''}
          {resultCount > 0 ? ` · ${resultCount.toLocaleString()} results` : ''}
        </p>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {searches.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground text-center">{t('noSavedSearches')}</p>
        ) : (
          <ul className="py-1">
            {searches.map((search) => (
              <li
                key={search.id}
                className="group flex items-start gap-2 px-3 py-2 hover:bg-muted/50"
              >
                <Link href={search.url} className="flex-1 min-w-0" onClick={() => onNavigate?.()}>
                  <span className="text-sm font-medium truncate block">{search.label}</span>
                  <span className="text-[11px] text-muted-foreground block truncate">
                    {buildFilterSummary(search.keyword, search.filterCount, search.resultType)}
                    {' · '}
                    {search.resultCount.toLocaleString()} results
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleRemove(search.id)}
                  className="shrink-0 mt-0.5 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
                  aria-label={t('deleteSavedSearch', { name: search.label })}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
