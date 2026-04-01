'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bookmark, BookmarkCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SEARCH_RESULT_CONFIG, type ResultType } from '@/lib/search-types';
import {
  type SavedSearch,
  addSavedSearch,
  buildFilterSummary,
  getSavedSearches,
  removeSavedSearch,
} from '@/lib/saved-searches';

type SavedSearchesPanelProps = {
  resultType: ResultType;
  keyword: string;
  filterCount: number;
  resultCount: number;
  /** When following a saved link (e.g. close parent dropdown). */
  onNavigate?: () => void;
  /** After a successful save (e.g. flash trigger icon). */
  onSaveComplete?: () => void;
  /** Focus name field on mount (popover trigger). */
  autoFocusNameInput?: boolean;
};

export function SavedSearchesPanel({
  resultType,
  keyword,
  filterCount,
  resultCount,
  onNavigate,
  onSaveComplete,
  autoFocusNameInput = false,
}: SavedSearchesPanelProps) {
  const [searches, setSearches] = React.useState<SavedSearch[]>(() => getSavedSearches());
  const [label, setLabel] = React.useState('');

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
    onSaveComplete?.();
  }, [label, resultType, keyword, filterCount, resultCount, onSaveComplete]);

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
        <p className="text-xs font-medium text-muted-foreground mb-2">Save this search</p>
        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder="Name this search…"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus={autoFocusNameInput}
            className="flex-1 min-w-0 rounded-md border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button size="sm" onClick={handleSave} disabled={!label.trim()}>
            Save
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          {SEARCH_RESULT_CONFIG[resultType].label}
          {keyword ? ` · "${keyword}"` : ''}
          {filterCount > 0 ? ` · ${filterCount} filter${filterCount > 1 ? 's' : ''}` : ''}
          {resultCount > 0 ? ` · ${resultCount.toLocaleString()} results` : ''}
        </p>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {searches.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground text-center">No saved searches yet</p>
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
                  aria-label={`Delete saved search "${search.label}"`}
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

type SavedSearchesDropdownProps = {
  resultType: ResultType;
  keyword: string;
  filterCount: number;
  resultCount: number;
  triggerId?: string;
};

export function SavedSearchesDropdown({
  resultType,
  keyword,
  filterCount,
  resultCount,
  triggerId,
}: SavedSearchesDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [justSaved, setJustSaved] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={triggerId} variant="ghost" size="sm">
          {justSaved ? (
            <BookmarkCheck className="h-4 w-4 text-green-600" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
          <span className="ml-1 hidden sm:inline">{justSaved ? 'Saved' : 'Save'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <SavedSearchesPanel
          resultType={resultType}
          keyword={keyword}
          filterCount={filterCount}
          resultCount={resultCount}
          autoFocusNameInput
          onNavigate={() => setOpen(false)}
          onSaveComplete={() => {
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 1500);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
