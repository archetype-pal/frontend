'use client';

import * as React from 'react';
import { Search, Quote, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MatchSnippet } from '@/components/search/highlight';
import { suggestionTypeLabel } from '@/lib/search-suggestion-target';
import type { ResultType } from '@/lib/search-types';

/** Shared hook for keyword suggestions from a pool (used by Header and DynamicFacets). */
export function useKeywordSuggestions(keyword: string, pool: string[]) {
  const deferredKeyword = React.useDeferredValue(keyword);
  return React.useMemo(() => {
    if (!deferredKeyword) return [];
    const low = deferredKeyword.toLowerCase();
    return Array.from(
      new Set(pool.filter((s) => s.toLowerCase().startsWith(low) && s.toLowerCase() !== low))
    )
      .slice(0, 5)
      .map((value) => ({ id: `local:${value}`, label: value, value }));
  }, [deferredKeyword, pool]);
}

export type KeywordSuggestionItem = {
  id: string;
  label: string;
  value: string;
  type?: ResultType | 'all';
  /** KWIC excerpt with `__hl_start__`/`__hl_end__` markers (text/clause hits). */
  snippet?: string;
};

export type KeywordHistoryItem = {
  id: string;
  label: string;
  value: string;
  meta?: string;
};

type KeywordSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  onTriggerSearch: (keyword: string) => void;
  /**
   * Called when a suggestion is chosen, BEFORE the keyword-search fallback.
   * Return `true` if the selection was handled by navigating to the entity/tab
   * (so no keyword search runs); return falsy to fall through to a search.
   */
  onSuggestionNavigate?: (item: KeywordSuggestionItem) => boolean;
  suggestions: KeywordSuggestionItem[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** Classes for the leading magnifier icon (e.g. lighten it on a dark header). */
  iconClassName?: string;
  /** When true, clears the input on focus (e.g. for header search) */
  clearOnFocus?: boolean;
  /** Called when the input receives focus (e.g. to load suggestions from any page) */
  onFocus?: () => void;
  suggestionsLoading?: boolean;
  noSuggestionsText?: string;
  inputId?: string;
  recentSearches?: KeywordHistoryItem[];
  onClearRecentSearches?: () => void;
  /** When true, submitted keyword is wrapped in double quotes (phrase search). */
  exactPhrase?: boolean;
  onExactPhraseChange?: (value: boolean) => void;
};

export function KeywordSearchInput({
  value,
  onChange,
  onTriggerSearch,
  onSuggestionNavigate,
  suggestions,
  placeholder = 'Type and press Enter…',
  className,
  inputClassName,
  iconClassName,
  clearOnFocus = false,
  onFocus: onFocusProp,
  suggestionsLoading = false,
  noSuggestionsText = 'No suggestions. Press Enter to search.',
  inputId,
  recentSearches = [],
  onClearRecentSearches,
  exactPhrase = false,
  onExactPhraseChange,
}: KeywordSearchInputProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const [dismissed, setDismissed] = React.useState(true);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.currentTarget.value);
      setSelectedIndex(-1);
      setDismissed(false);
    },
    [onChange]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (suggestions.length > 0) {
            setSelectedIndex((si) => (si < suggestions.length - 1 ? si + 1 : 0));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (suggestions.length > 0) {
            setSelectedIndex((si) => (si > 0 ? si - 1 : suggestions.length - 1));
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            const picked = suggestions[selectedIndex];
            if (onSuggestionNavigate?.(picked)) {
              setDismissed(true);
              break;
            }
            onTriggerSearch(picked.value);
          } else {
            const raw = value.trim();
            if (!raw) {
              onTriggerSearch('');
              break;
            }
            if (
              exactPhrase &&
              !(raw.startsWith('"') && raw.endsWith('"')) &&
              !(raw.startsWith("'") && raw.endsWith("'"))
            ) {
              onTriggerSearch(`"${raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
            } else {
              onTriggerSearch(raw);
            }
          }
          break;
        case 'Escape':
          setSelectedIndex(-1);
          setDismissed(true);
          break;
      }
    },
    [suggestions, selectedIndex, value, onTriggerSearch, onSuggestionNavigate, exactPhrase]
  );

  const handleFocus = React.useCallback(() => {
    if (clearOnFocus) {
      onChange('');
      setSelectedIndex(-1);
    }
    setDismissed(false);
    onFocusProp?.();
  }, [clearOnFocus, onChange, onFocusProp]);

  const handleBlur = React.useCallback(() => {
    // Delay so clicks on suggestions register before dismissing
    setTimeout(() => setDismissed(true), 150);
  }, []);

  const handleSuggestionClick = React.useCallback(
    (item: KeywordSuggestionItem) => {
      if (onSuggestionNavigate?.(item)) {
        setDismissed(true);
        return;
      }
      const raw = item.value.trim();
      if (
        exactPhrase &&
        raw &&
        !(raw.startsWith('"') && raw.endsWith('"')) &&
        !(raw.startsWith("'") && raw.endsWith("'"))
      ) {
        onTriggerSearch(`"${raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
      } else {
        onTriggerSearch(item.value);
      }
      setDismissed(true);
    },
    [exactPhrase, onTriggerSearch, onSuggestionNavigate]
  );

  const showRecent = value.trim().length === 0 && recentSearches.length > 0;
  const showDropdown =
    !dismissed &&
    (showRecent || suggestionsLoading || suggestions.length > 0 || value.trim().length >= 2);

  return (
    <div className={className ? `relative ${className}` : 'relative'}>
      <Search
        className={
          'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ' +
          (iconClassName ?? 'text-muted-foreground')
        }
      />
      {onExactPhraseChange && (
        <button
          type="button"
          title={exactPhrase ? 'Phrase search on' : 'Match exact phrase'}
          aria-pressed={exactPhrase}
          onClick={() => onExactPhraseChange(!exactPhrase)}
          className={
            'absolute right-2 top-1/2 z-[1] -translate-y-1/2 rounded p-1 transition-colors ' +
            (exactPhrase
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground')
          }
        >
          <Quote className="h-4 w-4" />
        </button>
      )}
      <Input
        id={inputId}
        className={
          inputClassName
            ? `pl-9 ${onExactPhraseChange ? 'pr-10 ' : ''}${inputClassName}`
            : `pl-9${onExactPhraseChange ? ' pr-10' : ''}`
        }
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls="keyword-suggestions"
        aria-busy={suggestionsLoading}
        aria-activedescendant={
          selectedIndex >= 0 && suggestions[selectedIndex]
            ? `keyword-suggestion-${selectedIndex}`
            : undefined
        }
      />
      {showDropdown && (
        <ul
          id="keyword-suggestions"
          className="absolute z-20 mt-1.5 max-h-[22rem] w-full overflow-auto rounded-lg border border-border bg-popover py-1.5 text-[0.9rem] text-popover-foreground shadow-lg ring-1 ring-black/5"
          role="listbox"
          aria-live="polite"
        >
          {showRecent && (
            <>
              <li className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recent
              </li>
              {recentSearches.map((item) => (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={false}
                  className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-popover-foreground transition-colors hover:bg-accent/10"
                  onClick={() => handleSuggestionClick(item)}
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate">{item.label}</span>
                    {item.meta && (
                      <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {item.meta}
                      </span>
                    )}
                  </span>
                </li>
              ))}
              {onClearRecentSearches && (
                <li className="mt-1 border-t border-border px-3 py-1.5">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onClearRecentSearches();
                    }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Clear history
                  </button>
                </li>
              )}
            </>
          )}
          {suggestionsLoading && (
            <li className="px-3 py-2 text-xs text-muted-foreground" aria-live="polite">
              Loading suggestions…
            </li>
          )}
          {suggestions.map((item, i) => (
            <li
              key={item.id}
              id={`keyword-suggestion-${i}`}
              role="option"
              aria-selected={i === selectedIndex}
              className={
                'flex cursor-pointer flex-col gap-1 px-3 py-2 text-popover-foreground transition-colors ' +
                (i === selectedIndex ? 'bg-accent/15' : 'hover:bg-accent/10')
              }
              onMouseEnter={() => setSelectedIndex(i)}
              onMouseLeave={() => setSelectedIndex(-1)}
              onClick={() => handleSuggestionClick(item)}
            >
              <span className="flex items-center gap-2.5">
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="truncate">{item.label}</span>
                  {item.type && item.type !== 'all' && (
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {suggestionTypeLabel(item.type)}
                    </span>
                  )}
                </span>
              </span>
              {item.snippet && (
                <MatchSnippet
                  formatted={item.snippet}
                  className="block pl-6 text-[0.8rem] text-muted-foreground"
                />
              )}
            </li>
          ))}
          {!suggestionsLoading && suggestions.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">{noSuggestionsText}</li>
          )}
        </ul>
      )}
    </div>
  );
}
