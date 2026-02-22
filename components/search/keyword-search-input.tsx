'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

/** Shared hook for keyword suggestions from a pool (used by Header and DynamicFacets). */
export function useKeywordSuggestions(keyword: string, pool: string[]) {
  return React.useMemo(() => {
    if (!keyword) return [];
    const low = keyword.toLowerCase();
    return Array.from(
      new Set(pool.filter((s) => s.toLowerCase().startsWith(low) && s.toLowerCase() !== low))
    ).slice(0, 5);
  }, [keyword, pool]);
}

type KeywordSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  onTriggerSearch: (keyword: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** When true, clears the input on focus (e.g. for header search) */
  clearOnFocus?: boolean;
  /** Called when the input receives focus (e.g. to load suggestions from any page) */
  onFocus?: () => void;
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
}: KeywordSearchInputProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(-1);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.currentTarget.value);
      setSelectedIndex(-1);
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
            onTriggerSearch(suggestions[selectedIndex]);
          } else if (value.trim()) {
            onTriggerSearch(value.trim());
          } else {
            onTriggerSearch('');
          }
          break;
        case 'Escape':
          setSelectedIndex(-1);
          break;
      }
    },
    [suggestions, selectedIndex, value, onTriggerSearch]
  );

  const handleFocus = React.useCallback(() => {
    if (clearOnFocus) {
      onChange('');
      setSelectedIndex(-1);
    }
    onFocusProp?.();
  }, [clearOnFocus, onChange, onFocusProp]);

  const handleSuggestionClick = React.useCallback(
    (s: string) => {
      onTriggerSearch(s);
    },
    [onTriggerSearch]
  );

  return (
    <div className={className ? `relative ${className}` : 'relative'}>
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
      <Input
        className={inputClassName ? `pl-8 ${inputClassName}` : 'pl-8'}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        aria-autocomplete="list"
        aria-expanded={suggestions.length > 0}
        aria-controls="keyword-suggestions"
        aria-activedescendant={
          selectedIndex >= 0 && suggestions[selectedIndex]
            ? `keyword-suggestion-${selectedIndex}`
            : undefined
        }
      />
      {suggestions.length > 0 && (
        <ul
          id="keyword-suggestions"
          className="absolute z-10 bg-white border border-gray-200 text-gray-900 mt-1 w-full max-h-40 overflow-auto rounded-md shadow-md"
          role="listbox"
        >
          {suggestions.map((s, i) => (
            <li
              key={s}
              id={`keyword-suggestion-${i}`}
              role="option"
              aria-selected={i === selectedIndex}
              className={
                'px-2 py-1 cursor-pointer text-gray-900 ' +
                (i === selectedIndex ? 'bg-gray-200' : 'hover:bg-gray-100')
              }
              onMouseEnter={() => setSelectedIndex(i)}
              onMouseLeave={() => setSelectedIndex(-1)}
              onClick={() => handleSuggestionClick(s)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
