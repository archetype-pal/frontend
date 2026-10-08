'use client';

import { useState, useRef } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { PenTool, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, sortableHeader } from '@/components/backoffice/common/data-table';
import { DataPagination } from '@/components/ui/data-pagination';
import { getHands } from '@/services/backoffice/scribes';
import { usePageSize } from '@/hooks/backoffice/use-page-size';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { toOrdering } from '@/lib/backoffice/ordering';
import { useDebouncedSearch } from '@/hooks/backoffice/use-debounced-search';
import type { AdminHandListItem } from '@/types/backoffice';

function buildColumns(t: ReturnType<typeof useTranslations>): ColumnDef<AdminHandListItem>[] {
  return [
    {
      accessorKey: 'name',
      header: sortableHeader(t('hands.colName')),
      cell: ({ row }) => (
        <Link
          href={`/backoffice/hands/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'scribe_name',
      header: sortableHeader(t('hands.colScribe')),
      cell: ({ row }) => (
        <Link
          href={`/backoffice/scribes/${row.original.scribe}`}
          className="text-sm hover:underline"
        >
          {row.original.scribe_name}
        </Link>
      ),
      size: 120,
    },
    {
      accessorKey: 'item_part_display',
      header: t('hands.colItemPart'),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate">
          {row.original.item_part_display}
        </span>
      ),
    },
    {
      accessorKey: 'script_name',
      header: t('hands.colScript'),
      cell: ({ row }) =>
        row.original.script_name ? (
          <Badge variant="outline" className="text-xs">
            {row.original.script_name}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
      size: 100,
    },
    {
      accessorKey: 'date_display',
      header: t('hands.colDate'),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.date_display ?? '—'}</span>
      ),
      size: 100,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Link href={`/backoffice/hands/${row.original.id}`}>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>
      ),
      size: 50,
    },
  ];
}

const ORDERING_FIELDS = { name: 'name', scribe_name: 'scribe__name' };

export default function HandsPage() {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const columns = buildColumns(t);
  const { searchInput, setSearchInput, search, page, setPage } = useDebouncedSearch();
  const [pageSize, setPageSize] = usePageSize('hands', 20);
  const tableRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const ordering = toOrdering(sorting, ORDERING_FIELDS);

  const queryParams = {
    limit: pageSize,
    offset: page * pageSize,
    ...(search ? { search } : {}),
    ...(ordering ? { ordering } : {}),
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: backofficeKeys.hands.list(queryParams),
    queryFn: () => getHands(queryParams),
    enabled: !!token,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <PenTool className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('hands.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? '...' : t('hands.subtitle', { count: data?.count ?? 0 })}
          </p>
        </div>
      </div>

      <DataTable
        tableRef={tableRef}
        isError={isError}
        isLoading={isLoading}
        onRetry={() => refetch()}
        columns={columns}
        data={data?.results ?? []}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={t('hands.searchPlaceholder')}
        pagination={false}
        sorting={sorting}
        onSortingChange={(next) => {
          setSorting(next);
          setPage(0);
        }}
      />

      {data && (
        <DataPagination
          scrollTargetRef={tableRef}
          totalItems={data.count}
          page={page + 1}
          pageSize={pageSize}
          onPageChange={(p) => setPage(p - 1)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(0);
          }}
        />
      )}
    </div>
  );
}
