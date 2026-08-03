'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { Trash2, ExternalLink, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ServerPagination } from '@/components/backoffice/common/server-pagination';
import {
  DataTable,
  sortableHeader,
  type BulkAction,
} from '@/components/backoffice/common/data-table';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { getTrashedGraphs, restoreGraph, purgeGraph } from '@/services/backoffice/annotations';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { runBulkAction } from '@/lib/backoffice/bulk-action';
import { formatReviewAge } from '@/lib/backoffice/review-queue-sla';
import type { GraphItem } from '@/types/backoffice';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

// One entry per trashable model. Later models (texts, images, …) are new
// entries here, not new pages.
const TRASH_TABS = [{ key: 'annotations', labelKey: 'trash.tabAnnotations' }] as const;

type TrashTabKey = (typeof TRASH_TABS)[number]['key'];

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

  const filters = useMemo(
    () => ({ deleted: 'true', limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [page]
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: backofficeKeys.graphs.list(filters),
    queryFn: () => getTrashedGraphs(token!, { limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    enabled: !!token,
  });

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
        accessorKey: 'image_display',
        header: t('trash.colImage'),
        cell: ({ row }) => <span className="text-xs">{row.original.image_display}</span>,
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
          pastTense: 'restored',
          noun: 'annotation',
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

      <DataTable
        key={`${activeTab}-${tableEpoch}`}
        columns={columns}
        data={rows}
        isError={isError}
        onRetry={refetch}
        pagination={false}
        enableRowSelection
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
            pastTense: 'permanently deleted',
            noun: 'annotation',
          });
          setTableEpoch((n) => n + 1);
        }}
      />
    </div>
  );
}
