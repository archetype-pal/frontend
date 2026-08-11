'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { Trash2, ExternalLink, RotateCcw, Image as ImageIcon, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ServerPagination } from '@/components/backoffice/common/server-pagination';
import {
  DataTable,
  sortableHeader,
  type BulkAction,
} from '@/components/backoffice/common/data-table';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import {
  getTrashedGraphs,
  getTrashActors,
  restoreGraph,
  purgeGraph,
} from '@/services/backoffice/annotations';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { runBulkAction } from '@/lib/backoffice/bulk-action';
import { formatReviewAge } from '@/lib/backoffice/review-queue-sla';
import {
  ALL,
  EMPTY_TRASH_FILTERS,
  buildTrashFilterParams,
  hasActiveTrashFilters,
} from '@/lib/backoffice/trash-filters';
import type { GraphItem } from '@/types/backoffice';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

// One entry per trashable model — later models are entries here, not new pages.
const TRASH_TABS = [{ key: 'annotations', labelKey: 'trash.tabAnnotations' }] as const;

type TrashTabKey = (typeof TRASH_TABS)[number]['key'];

const ANNOTATION_TYPES = ['image', 'text', 'editorial', 'unknown'] as const;

export default function TrashPage() {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TrashTabKey>('annotations');
  const [page, setPage] = useState(0);
  const [purgeTarget, setPurgeTarget] = useState<GraphItem | null>(null);
  const [bulkPurgeIds, setBulkPurgeIds] = useState<string[] | null>(null);
  // Bumped after every bulk action: remounts the DataTable so row selection
  // doesn't linger over rows that just left the trash.
  const [tableEpoch, setTableEpoch] = useState(0);

  const [filterState, setFilterState] = useState(EMPTY_TRASH_FILTERS);

  // Reset to page 0: a narrower result set can strand you on a page that's gone.
  const updateFilter = (patch: Partial<typeof filterState>) => {
    setFilterState((prev) => ({ ...prev, ...patch }));
    setPage(0);
  };

  const filters = useMemo(
    () => ({
      deleted: 'true',
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      ...buildTrashFilterParams(filterState),
    }),
    [page, filterState]
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: backofficeKeys.graphs.list(filters),
    queryFn: () =>
      getTrashedGraphs(token!, {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        ...buildTrashFilterParams(filterState),
      }),
    enabled: !!token,
  });

  // Keyed under the graphs namespace so invalidateGraphs() refreshes it:
  // restoring someone's last trashed row drops them from the dropdown.
  const { data: actors } = useQuery({
    queryKey: [...backofficeKeys.graphs.all(), 'trash-actors'],
    queryFn: () => getTrashActors(token!),
    enabled: !!token,
  });

  const actorOptions = useMemo(() => {
    const names = actors ?? [];
    // Keep an active selection listed even once its last row leaves the trash,
    // otherwise the trigger renders blank while the filter is still applied.
    return filterState.deletedBy !== ALL && !names.includes(filterState.deletedBy)
      ? [...names, filterState.deletedBy]
      : names;
  }, [actors, filterState.deletedBy]);

  const invalidateGraphs = () =>
    queryClient.invalidateQueries({ queryKey: backofficeKeys.graphs.all() });

  const restoreMut = useMutation({
    mutationFn: (id: number) => restoreGraph(token!, id),
    onSuccess: () => {
      toast.success(t('trash.toastRestored'), { description: t('trash.reindexHint') });
      invalidateGraphs();
    },
    onError: (err) =>
      toast.error(t('trash.toastRestoreFailed'), { description: formatApiError(err) }),
  });

  const purgeMut = useMutation({
    mutationFn: (id: number) => purgeGraph(token!, id),
    onSuccess: () => {
      toast.success(t('trash.toastPurged'), { description: t('trash.reindexHint') });
      invalidateGraphs();
      setPurgeTarget(null);
    },
    onError: (err) =>
      toast.error(t('trash.toastPurgeFailed'), { description: formatApiError(err) }),
  });

  const columns: ColumnDef<GraphItem>[] = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: sortableHeader(t('trash.colId')),
        cell: ({ row }) => (
          <span className="text-xs tabular-nums text-muted-foreground">#{row.original.id}</span>
        ),
        size: 70,
      },
      {
        accessorKey: 'allograph_name',
        header: sortableHeader(t('trash.colAllograph')),
        cell: ({ row }) =>
          row.original.allograph_name ? (
            <Badge variant="outline" className="text-xs font-mono">
              {row.original.allograph_name}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: 'hand_name',
        header: sortableHeader(t('trash.colHand')),
        cell: ({ row }) => {
          const { hand, hand_name } = row.original;
          // Editorial and TEXT-typed graphs have no hand, so nothing to link to.
          if (hand === null) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <Link
              href={`/backoffice/hands/${hand}`}
              className="text-sm text-primary hover:underline"
            >
              {hand_name || `#${hand}`}
            </Link>
          );
        },
      },
      {
        accessorKey: 'image_display',
        header: t('trash.colImage'),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            {row.original.image_display}
          </span>
        ),
      },
      {
        accessorKey: 'annotation_type',
        header: t('trash.colType'),
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {row.original.annotation_type ?? t('trash.typeUnknown')}
          </Badge>
        ),
        size: 90,
      },
      {
        accessorKey: 'created',
        header: t('trash.colCreated'),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.created ? new Date(row.original.created).toLocaleDateString() : '—'}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: 'deleted_by',
        header: t('trash.colDeletedBy'),
        cell: ({ row }) => <span className="text-xs">{row.original.deleted_by ?? '—'}</span>,
        size: 110,
      },
      {
        accessorKey: 'deleted_at',
        header: sortableHeader(t('trash.colDeletedAge')),
        cell: ({ row }) => {
          const deletedAt = row.original.deleted_at;
          if (!deletedAt) return null;
          const ms = Math.max(0, Date.now() - new Date(deletedAt).getTime());
          return (
            <span
              className="text-xs text-muted-foreground"
              title={new Date(deletedAt).toLocaleString()}
            >
              {formatReviewAge(ms)}
            </span>
          );
        },
        size: 90,
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={`${t('trash.restore')} #${row.original.id}`}
              onClick={() => restoreMut.mutate(row.original.id)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              aria-label={`${t('trash.purge')} #${row.original.id}`}
              onClick={() => setPurgeTarget(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Link
              href={`/manuscripts/${row.original.historical_item}/images/${row.original.item_image}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('trash.openImage')}
            >
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        ),
        size: 110,
      },
    ],
    [t, restoreMut]
  );

  const rows = data?.results ?? [];
  const totalCount = data?.count ?? 0;

  const bulkActions: BulkAction[] = [
    {
      label: t('trash.restore'),
      icon: <RotateCcw className="h-3 w-3" />,
      action: async (ids) => {
        await runBulkAction({
          ids,
          action: (id) => restoreGraph(token!, Number(id)),
          invalidate: invalidateGraphs,
          messages: {
            success: (count) => t('trash.bulkRestored', { count }),
            allFailed: () => t('trash.bulkRestoreFailed'),
            partial: (succeeded, failed) => t('trash.bulkPartial', { succeeded, failed }),
          },
        });
        setTableEpoch((n) => n + 1);
      },
    },
    {
      label: t('trash.purge'),
      variant: 'destructive',
      icon: <Trash2 className="h-3 w-3" />,
      action: (ids) => setBulkPurgeIds(ids),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Trash2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('trash.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('trash.subtitle')}</p>
        </div>
      </div>

      {/* Tab bar — one tab today; future trashable types slot in here. */}
      <div className="flex items-center gap-2 border-b">
        {TRASH_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={
              activeTab === tab.key
                ? 'border-b-2 border-primary px-3 py-2 text-sm font-medium'
                : 'px-3 py-2 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            {t(tab.labelKey)}
            {tab.key === activeTab && !isLoading && (
              <span className="ml-2 text-xs text-muted-foreground">
                {t('trash.trashedCount', { count: totalCount })}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('trash.filters')}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t('trash.colType')}</Label>
            <Select
              value={filterState.annotationType}
              onValueChange={(value) => updateFilter({ annotationType: value })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('trash.filterAllTypes')}</SelectItem>
                {ANNOTATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type} className="capitalize">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('trash.colDeletedBy')}</Label>
            <Select
              value={filterState.deletedBy}
              onValueChange={(value) => updateFilter({ deletedBy: value })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('trash.filterAllUsers')}</SelectItem>
                {actorOptions.map((username) => (
                  <SelectItem key={username} value={username}>
                    {username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="trash-deleted-from">
              {t('trash.filterDeletedFrom')}
            </Label>
            <Input
              id="trash-deleted-from"
              type="datetime-local"
              className="h-8 text-xs"
              value={filterState.deletedFrom}
              max={filterState.deletedTo || undefined}
              onChange={(e) => updateFilter({ deletedFrom: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="trash-deleted-to">
              {t('trash.filterDeletedTo')}
            </Label>
            <Input
              id="trash-deleted-to"
              type="datetime-local"
              className="h-8 text-xs"
              value={filterState.deletedTo}
              min={filterState.deletedFrom || undefined}
              onChange={(e) => updateFilter({ deletedTo: e.target.value })}
            />
          </div>
        </div>
        {hasActiveTrashFilters(filterState) && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs"
            onClick={() => {
              setFilterState(EMPTY_TRASH_FILTERS);
              setPage(0);
            }}
          >
            {t('trash.clearFilters')}
          </Button>
        )}
      </div>

      <DataTable
        key={`${activeTab}-${tableEpoch}`}
        columns={columns}
        data={rows}
        isError={isError}
        onRetry={refetch}
        pagination={false}
        enableRowSelection
        enableColumnVisibility
        bulkActions={bulkActions}
      />
      <ServerPagination
        total={totalCount}
        pageSize={PAGE_SIZE}
        page={page}
        hasNext={Boolean(data?.next)}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={!!purgeTarget}
        onOpenChange={(open) => !open && setPurgeTarget(null)}
        title={t('trash.purgeTitle')}
        description={purgeTarget ? t('trash.purgeDesc', { id: purgeTarget.id }) : undefined}
        confirmLabel={t('trash.purgeConfirm')}
        variant="destructive"
        loading={purgeMut.isPending}
        onConfirm={() => purgeTarget && purgeMut.mutate(purgeTarget.id)}
      />

      <ConfirmDialog
        open={!!bulkPurgeIds}
        onOpenChange={(open) => !open && setBulkPurgeIds(null)}
        title={t('trash.bulkPurgeTitle', { count: bulkPurgeIds?.length ?? 0 })}
        description={t('trash.bulkPurgeDesc')}
        confirmLabel={t('trash.purgeConfirm')}
        variant="destructive"
        onConfirm={async () => {
          const ids = bulkPurgeIds ?? [];
          setBulkPurgeIds(null);
          await runBulkAction({
            ids,
            action: (id) => purgeGraph(token!, Number(id)),
            invalidate: invalidateGraphs,
            messages: {
              success: (count) => t('trash.bulkPurged', { count }),
              allFailed: () => t('trash.bulkPurgeFailed'),
              partial: (succeeded, failed) => t('trash.bulkPartial', { succeeded, failed }),
            },
          });
          setTableEpoch((n) => n + 1);
        }}
      />
    </div>
  );
}
