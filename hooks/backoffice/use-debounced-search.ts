import { useEffect, useState } from 'react';

/**
 * Manages debounced search input with server-side pagination state.
 * Resets to page 0 whenever the debounced search value changes, and only then.
 *
 * @param delay debounce delay in ms (default 300)
 * @param initialValue seed for both the raw input and the debounced value, so a
 *   pre-filled query searches immediately instead of after one debounce tick
 *   (used by the `<ref>` picker, which seeds from the editor selection). Read
 *   on first render only — later changes do not clobber what the user typed.
 */
export function useDebouncedSearch(delay = 300, initialValue = '') {
  const [searchInput, setSearchInput] = useState(initialValue);
  const [search, setSearch] = useState(initialValue);
  const [page, setPage] = useState(0);

  useEffect(() => {
    // Only a changed query starts over at page 0: an unchanged one (on mount,
    // or typed back to what it was) must not undo a page the user picked.
    if (searchInput === search) return;
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, delay);
    return () => clearTimeout(timer);
  }, [searchInput, search, delay]);

  return { searchInput, setSearchInput, search, page, setPage } as const;
}
