'use client';

import { useState, useRef } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useTranslations } from 'next-intl';
import type { ColumnDef } from '@tanstack/react-table';
import { Archive, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DataTable, sortableHeader } from '@/components/backoffice/common/data-table';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { DataPagination } from '@/components/ui/data-pagination';
import {
  deleteCurrentItem,
  getCurrentItems,
  getRepositories,
} from '@/services/backoffice/manuscripts';
import { usePageSize } from '@/hooks/backoffice/use-page-size';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { BackofficeInlineError } from '@/components/backoffice/common/query-state';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import type { CurrentItemOption, Repository } from '@/types/backoffice';
import { useModelLabels } from '@/contexts/model-labels-context';
import { useDebouncedSearch } from '@/hooks/backoffice/use-debounced-search';

export default function PhysicalVolumesPage() {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { getLabel } = useModelLabels();
  const [repoFilter, setRepoFilter] = useState<string>('__all');
  const [deleteTarget, setDeleteTarget] = useState<CurrentItemOption | null>(null);
  const { searchInput, setSearchInput, search, page, setPage } = useDebouncedSearch();
  const [pageSize, setPageSize] = usePageSize('physical-volumes', 50);
  const tableRef = useRef<HTMLDivElement>(null);
  const shelfmarkLabel = getLabel('fieldShelfmark');
  const appManuscriptsLabel = getLabel('appManuscripts');

  const columns: ColumnDef<CurrentItemOption>[] = [
    {
      accessorKey: 'repository_name',
      header: sortableHeader(t('physicalVolumes.colRepository')),
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.original.repository_name}</span>
      ),
      size: 120,
    },
    {
      accessorKey: 'shelfmark',
      header: sortableHeader(shelfmarkLabel),
      cell: ({ row }) => <span className="text-sm">{row.original.shelfmark}</span>,
    },
    {
      accessorKey: 'description',
      header: t('physicalVolumes.colDescription'),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-1">
          {row.original.description || '—'}
        </span>
      ),
      size: 200,
    },
    {
      accessorKey: 'part_count',
      header: sortableHeader(t('physicalVolumes.colParts')),
      cell: ({ row }) => <span className="tabular-nums text-sm">{row.original.part_count}</span>,
      size: 70,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (row.original.part_count === 0) {
          return (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              aria-label={t('physicalVolumes.deleteAriaLabel', {
                repo: row.original.repository_name,
                shelfmark: row.original.shelfmark,
              })}
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          );
        }
        return (
          <span className="text-xs text-muted-foreground">
            {t('physicalVolumes.linkedToManuscripts', { label: appManuscriptsLabel.toLowerCase() })}
          </span>
        );
      },
      size: 120,
    },
  ];

  const {
    data: repositoriesData,
    isError: repositoriesFailed,
    isFetching: repositoriesFetching,
    refetch: refetchRepositories,
  } = useQuery({
    queryKey: backofficeKeys.repositories.all(),
    queryFn: () => getRepositories(),
    enabled: !!token,
  });

  const repositories: Repository[] = repositoriesData ?? [];

  const filterParams = {
    ...(repoFilter !== '__all' ? { repository: Number(repoFilter) } : {}),
    ...(search ? { search } : {}),
    limit: pageSize,
    offset: page * pageSize,
  };

  const { data, isLoading, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: backofficeKeys.currentItems.list(filterParams),
    queryFn: () => getCurrentItems(filterParams),
    enabled: !!token,
    placeholderData: keepPreviousData,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCurrentItem(id),
    onSuccess: () => {
      toast.success(t('physicalVolumes.toastDeleted'));
      queryClient.invalidateQueries({ queryKey: backofficeKeys.currentItems.all() });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(t('physicalVolumes.toastFailedDelete'), {
        description: formatApiError(err),
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Archive className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('physicalVolumes.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('physicalVolumes.subtitle', {
                count: data?.count ?? '...',
                repos: repositories.length,
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {repositoriesFailed && (
            <BackofficeInlineError
              message={t('repositories.loadFailed')}
              retrying={repositoriesFetching}
              onRetry={() => refetchRepositories()}
            />
          )}
          <Select
            value={repoFilter}
            onValueChange={(v) => {
              setRepoFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[220px] h-9">
              <SelectValue placeholder={t('physicalVolumes.filterAllRepositories')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">{t('physicalVolumes.filterAllRepositories')}</SelectItem>
              {repositories.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.label || r.name} ({r.place})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        tableRef={tableRef}
        isError={isError}
        isLoading={isLoading}
        isStale={isPlaceholderData}
        onRetry={() => refetch()}
        columns={columns}
        data={data?.results ?? []}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={t('physicalVolumes.searchPlaceholder', {
          label: shelfmarkLabel.toLowerCase(),
        })}
        pagination={false}
        enableColumnVisibility
        enableExport
        exportFilename="items"
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('physicalVolumes.deleteTitle')}
        description={
          deleteTarget
            ? t('physicalVolumes.deleteDescription', {
                repo: deleteTarget.repository_name,
                shelfmark: deleteTarget.shelfmark,
              })
            : undefined
        }
        confirmLabel={t('physicalVolumes.deleteConfirm')}
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (deleteTarget?.part_count === 0) {
            deleteMut.mutate(deleteTarget.id);
          }
        }}
      />
    </div>
  );
}
