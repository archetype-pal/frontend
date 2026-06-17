'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  KeywordSearchInput,
  useKeywordSuggestions,
  type KeywordSuggestionItem,
} from '@/components/search/keyword-search-input';
import { resolveSuggestionTarget } from '@/lib/search-suggestion-target';
import { useSearchContext } from '@/contexts/search-context';
import { useModelLabels } from '@/contexts/model-labels-context';
import {
  clearSearchHistory,
  getSearchHistory,
  type SearchHistoryEntry,
} from '@/lib/search-history';
import { resolveResultTypeLabel } from '@/lib/search-label-helpers';
import type { ResultType } from '@/lib/search-types';

type SearchKeywordBarProps = {
  searchType: ResultType;
  /** The live draft keyword (controlled by the page). */
  value: string;
  onChange: (value: string) => void;
  /** Commit a search (Enter / suggestion / history click). */
  onSubmit: (value: string) => void;
  exactPhrase?: boolean;
  onExactPhraseChange?: (value: boolean) => void;
  className?: string;
  inputClassName?: string;
  /** Defaults to the canonical id the `/`-hotkey focuses. */
  inputId?: string;
};

/**
 * The single, prominent keyword search for the search page, surfaced in the
 * sub-header. Wraps {@link KeywordSearchInput} with server + local suggestions
 * and recent-search history — the same behaviour the rail's keyword box had,
 * promoted to the header so there is one obvious place to type (the rail keeps
 * only its per-facet "search within" boxes).
 */
export function SearchKeywordBar({
  searchType,
  value,
  onChange,
  onSubmit,
  exactPhrase = false,
  onExactPhraseChange,
  className,
  inputClassName,
  inputId = 'search-keyword-input',
}: SearchKeywordBarProps) {
  const { suggestionsPool, getServerSuggestions } = useSearchContext();
  const { getLabel } = useModelLabels();
  const router = useRouter();
  const [history, setHistory] = React.useState<SearchHistoryEntry[]>([]);
  const localSuggestions = useKeywordSuggestions(value, suggestionsPool);
  const deferredKeyword = React.useDeferredValue(value);

  React.useEffect(() => {
    // Read recent searches from localStorage (an external, client-only store).
    // Re-running on `value` changes refreshes the list after a submit appends a
    // new entry; localStorage emits no same-tab change event, so `value` is the
    // refresh trigger. A useSyncExternalStore migration would need a custom
    // same-tab write event in lib/search-history.ts (out of scope here).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage; no same-tab change event exists to subscribe to
    setHistory(getSearchHistory());
  }, [value]);

  const serverSuggestionsQuery = useQuery({
    queryKey: ['facet-suggestions', searchType, deferredKeyword],
    queryFn: () => getServerSuggestions(deferredKeyword, [searchType]),
    enabled: deferredKeyword.trim().length >= 2,
    staleTime: 30_000,
    retry: false,
  });
  const effectiveSuggestions =
    serverSuggestionsQuery.data && serverSuggestionsQuery.data.length > 0
      ? serverSuggestionsQuery.data
      : localSuggestions;

  const triggerSearch = React.useCallback(
    (keyword: string) => {
      onChange(keyword);
      onSubmit(keyword);
    },
    [onChange, onSubmit]
  );

  // Entity suggestions open the record; a typed result of a different kind
  // switches to its results tab; query rows fall through to an in-place search.
  const navigateToSuggestion = React.useCallback(
    (item: KeywordSuggestionItem): boolean => {
      const target = resolveSuggestionTarget(item);
      if (target.kind === 'search') return false;
      if (target.kind === 'entity') {
        router.push(target.href);
        return true;
      }
      if (target.resultType === searchType) return false;
      const keyword = item.value.trim();
      const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
      router.push(`/search/${target.resultType}${query}`);
      return true;
    },
    [router, searchType]
  );

  return (
    <KeywordSearchInput
      inputId={inputId}
      value={value}
      onChange={onChange}
      onTriggerSearch={triggerSearch}
      onSuggestionNavigate={navigateToSuggestion}
      exactPhrase={exactPhrase}
      onExactPhraseChange={onExactPhraseChange}
      suggestions={effectiveSuggestions}
      placeholder="Search the corpus…"
      className={className}
      inputClassName={inputClassName}
      suggestionsLoading={serverSuggestionsQuery.isFetching}
      noSuggestionsText="No keyword suggestions yet. Press Enter to search."
      recentSearches={history.map((entry, idx) => ({
        id: `kwbar-${idx}-${entry.timestamp}`,
        label: entry.keyword,
        value: entry.keyword,
        meta: resolveResultTypeLabel(entry.resultType, getLabel),
      }))}
      onClearRecentSearches={() => {
        clearSearchHistory();
        setHistory([]);
      }}
    />
  );
}
