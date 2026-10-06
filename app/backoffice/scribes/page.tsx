'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Users, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, sortableHeader } from '@/components/backoffice/common/data-table';
import { DataPagination } from '@/components/ui/data-pagination';
import { getScribes, createScribe } from '@/services/backoffice/scribes';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { toOrdering } from '@/lib/backoffice/ordering';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { useDebouncedSearch } from '@/hooks/backoffice/use-debounced-search';
import { toast } from 'sonner';
import type { AdminScribeListItem } from '@/types/backoffice';

const ORDERING_FIELDS = { name: 'name', hand_count: 'hand_count' };

export default function ScribesPage() {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const columns: ColumnDef<AdminScribeListItem>[] = [
    {
      accessorKey: 'name',
      header: sortableHeader(t('scribes.colName')),
      cell: ({ row }) => (
        <Link
          href={`/backoffice/scribes/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'period_display',
      header: t('scribes.colPeriod'),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.period_display ?? '—'}</span>
      ),
      size: 120,
    },
    {
      accessorKey: 'scriptorium',
      header: t('scribes.colScriptorium'),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.scriptorium || '—'}</span>
      ),
      size: 120,
    },
    {
      accessorKey: 'hand_count',
      header: sortableHeader(t('scribes.colHands')),
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs tabular-nums">
          {row.original.hand_count}
        </Badge>
      ),
      size: 80,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Link href={`/backoffice/scribes/${row.original.id}`}>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>
      ),
      size: 50,
    },
  ];

  const { searchInput, setSearchInput, search, page, setPage } = useDebouncedSearch();
  const [pageSize, setPageSize] = useState(20);
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
    queryKey: backofficeKeys.scribes.list(queryParams),
    queryFn: () => getScribes(queryParams),
    enabled: !!token,
    placeholderData: keepPreviousData,
  });

  const createMut = useMutation({
    mutationFn: () => createScribe({ name: newName }),
    onSuccess: () => {
      toast.success(t('scribes.toastCreated'));
      queryClient.invalidateQueries({ queryKey: backofficeKeys.scribes.all() });
      setAddOpen(false);
      setNewName('');
    },
    onError: (err) => {
      toast.error(t('scribes.toastFailedCreate'), {
        description: formatApiError(err),
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('scribes.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? '...' : t('scribes.subtitle', { count: data?.count ?? 0 })}
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
        searchPlaceholder={t('scribes.searchPlaceholder')}
        pagination={false}
        sorting={sorting}
        onSortingChange={(next) => {
          setSorting(next);
          setPage(0);
        }}
        toolbarActions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t('scribes.newButton')}
          </Button>
        }
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('scribes.dialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-1.5">
            <Label>{t('scribes.fieldName')}</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('scribes.fieldNamePlaceholder')}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!newName.trim() || createMut.isPending}
            >
              {t('scribes.createButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
