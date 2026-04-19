import { useEffect, useRef, useState } from 'react';

/**
 * Manages debounced search input with server-side pagination state.
 * Resets to page 0 whenever the debounced search value changes.
 *
 * @param delay debounce delay in ms (default 300)
 */
export function useDebouncedSearch(delay = 300) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, delay);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput, delay]);

  return { searchInput, setSearchInput, search, page, setPage } as const;
}
