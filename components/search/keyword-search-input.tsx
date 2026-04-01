'use client';

import * as React from 'react';
import { Search, Quote } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  suggestions: KeywordSuggestionItem[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
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
  suggestions,
  placeholder = 'Type and press Enter…',
  className,
  inputClassName,
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
  const [dismissed, setDismissed] = React.useState(false);

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
            onTriggerSearch(suggestions[selectedIndex].value);
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
    [suggestions, selectedIndex, value, onTriggerSearch, exactPhrase]
  );

  const handleFocus = React.useCallback(() => {
    if (clearOnFocus) {
      onChange('');
      setSelectedIndex(-1);
    }
    setDismissed(false);
    onFocusProp?.();
  }, [clearOnFocus, onChange, onFocusProp]);

  const handleBlur = React.useCallback(() => {}, []);

  const handleSuggestionClick = React.useCallback(
    (item: KeywordSuggestionItem) => {
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
    [exactPhrase, onTriggerSearch]
  );

  const showRecent = value.trim().length === 0 && recentSearches.length > 0;
  const showDropdown =
    !dismissed &&
    (showRecent || suggestionsLoading || suggestions.length > 0 || value.trim().length >= 2);

  return (
    <div className={className ? `relative ${className}` : 'relative'}>
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
      {onExactPhraseChange && (
        <button
          type="button"
          title={exactPhrase ? 'Phrase search on' : 'Match exact phrase'}
          aria-pressed={exactPhrase}
          onClick={() => onExactPhraseChange(!exactPhrase)}
          className={
            'absolute right-2 top-1.5 z-[1] rounded p-1 transition-colors ' +
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
            ? `pl-8 ${onExactPhraseChange ? 'pr-10 ' : ''}${inputClassName}`
            : `pl-8${onExactPhraseChange ? ' pr-10' : ''}`
        }
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
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
          className="absolute z-10 bg-white border border-gray-200 text-gray-900 mt-1 w-full max-h-40 overflow-auto rounded-md shadow-md"
          role="listbox"
          aria-live="polite"
        >
          {showRecent && (
            <>
              <li className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Recent
              </li>
              {recentSearches.map((item) => (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={false}
                  className="px-2 py-1 cursor-pointer text-gray-900 hover:bg-gray-100"
                  onClick={() => handleSuggestionClick(item)}
                >
                  <span className="inline-flex items-center justify-between w-full gap-2">
                    <span className="truncate">{item.label}</span>
                    {item.meta && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {item.meta}
                      </span>
                    )}
                  </span>
                </li>
              ))}
              {onClearRecentSearches && (
                <li className="px-2 py-1 border-t">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onClearRecentSearches();
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear history
                  </button>
                </li>
              )}
            </>
          )}
          {suggestionsLoading && (
            <li className="px-2 py-1 text-xs text-muted-foreground" aria-live="polite">
              Loading suggestions...
            </li>
          )}
          {suggestions.map((item, i) => (
            <li
              key={item.id}
              id={`keyword-suggestion-${i}`}
              role="option"
              aria-selected={i === selectedIndex}
              className={
                'px-2 py-1 cursor-pointer text-gray-900 ' +
                (i === selectedIndex ? 'bg-gray-200' : 'hover:bg-gray-100')
              }
              onMouseEnter={() => setSelectedIndex(i)}
              onMouseLeave={() => setSelectedIndex(-1)}
              onClick={() => handleSuggestionClick(item)}
            >
              <span className="inline-flex items-center justify-between w-full gap-2">
                <span className="truncate">{item.label}</span>
                {item.type && item.type !== 'all' && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {item.type}
                  </span>
                )}
              </span>
            </li>
          ))}
          {!suggestionsLoading && suggestions.length === 0 && (
            <li className="px-2 py-1 text-xs text-muted-foreground">{noSuggestionsText}</li>
          )}
        </ul>
      )}
    </div>
  );
}
