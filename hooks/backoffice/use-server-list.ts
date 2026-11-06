import { useState } from 'react';
import type { SortingState } from '@tanstack/react-table';
import type { ServerPagination } from '@/components/backoffice/common/data-table';
import { toOrdering } from '@/lib/backoffice/ordering';
import { useDebouncedSearch } from './use-debounced-search';
import { usePageSize } from './use-page-size';

/**
 * The state of a server-paged `DataTable`: debounced search, page, rows per
 * page (remembered under *tableKey*) and column sort mapped through
 * *orderingFields*. A new search, sort or page size goes back to page one.
 */
export function useServerList(
  tableKey: string,
  defaultPageSize: number,
  orderingFields: Record<string, string>
) {
  const { searchInput, setSearchInput, search, page, setPage } = useDebouncedSearch();
  const [pageSize, setPageSize] = usePageSize(tableKey, defaultPageSize);
  const [sorting, setSorting] = useState<SortingState>([]);
  const ordering = toOrdering(sorting, orderingFields);

  return {
    /** For filters of the page's own: a narrower list can strand you past its end. */
    setPage,
    /** The list request's paging, search and ordering. */
    params: {
      limit: pageSize,
      offset: page * pageSize,
      ...(search ? { search } : {}),
      ...(ordering ? { ordering } : {}),
    },
    /** For a table with a search box. */
    searchProps: { searchValue: searchInput, onSearchChange: setSearchInput },
    /** Sorting, and the pager once the server's total is known. */
    tableProps: (totalItems: number | undefined) => ({
      sorting,
      onSortingChange: (next: SortingState) => {
        setSorting(next);
        setPage(0);
      },
      serverPagination:
        totalItems === undefined
          ? undefined
          : ({
              totalItems,
              page: page + 1,
              pageSize,
              onPageChange: (p) => setPage(p - 1),
              onPageSizeChange: (size) => {
                setPageSize(size);
                setPage(0);
              },
            } satisfies ServerPagination),
    }),
  };
}
