'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { ScanLine, ExternalLink, Trash2, Image as ImageIcon, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServerPagination } from '@/components/backoffice/common/server-pagination';
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
import {
  DataTable,
  sortableHeader,
  type BulkAction,
} from '@/components/backoffice/common/data-table';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { getGraphs, deleteGraph } from '@/services/backoffice/annotations';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { runBulkAction } from '@/lib/backoffice/bulk-action';
import type { GraphItem } from '@/types/backoffice';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

export default function AnnotationsPage() {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const ANNOTATION_TYPES = useMemo(
    () => [
      { value: '__all', label: t('annotations.filterAllTypes') },
      { value: 'image', label: t('annotations.filterImage') },
      { value: 'text', label: t('annotations.filterText') },
      { value: 'editorial', label: t('annotations.filterEditorial') },
      { value: 'unknown', label: t('annotations.filterUnknown') },
    ],
    [t]
  );

  const columns: ColumnDef<GraphItem>[] = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: sortableHeader(t('annotations.colId')),
        cell: ({ row }) => (
          <span className="text-xs tabular-nums text-muted-foreground">#{row.original.id}</span>
        ),
        size: 70,
      },
      {
        accessorKey: 'allograph_name',
        header: sortableHeader(t('annotations.colAllograph')),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              {row.original.allograph_name}
            </Badge>
          </div>
        ),
      },
      {
        accessorKey: 'hand_name',
        header: sortableHeader(t('annotations.colHand')),
        cell: ({ row }) => (
          <Link
            href={`/backoffice/hands/${row.original.hand}`}
            className="text-sm text-primary hover:underline"
          >
            {row.original.hand_name}
          </Link>
        ),
      },
      {
        accessorKey: 'image_display',
        header: t('annotations.colImage'),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            {row.original.image_display}
          </span>
        ),
      },
      {
        accessorKey: 'annotation_type',
        header: t('annotations.colType'),
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-[10px] capitalize">
            {row.original.annotation_type ?? 'unknown'}
          </Badge>
        ),
        size: 90,
      },
      {
        id: 'components',
        header: t('annotations.colComponents'),
        cell: ({ row }) => {
          const components = row.original.graphcomponent_set;
          if (!components || components.length === 0) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <div className="flex gap-1 flex-wrap">
              {components.slice(0, 3).map((gc) => (
                <Badge key={gc.id} variant="outline" className="text-[10px]">
                  {gc.component_name}
                </Badge>
              ))}
              {components.length > 3 && (
                <Badge variant="outline" className="text-[10px]">
                  +{components.length - 3}
                </Badge>
              )}
            </div>
          );
        },
        size: 180,
      },
      {
        id: 'positions',
        header: t('annotations.colPositions'),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {row.original.positions?.length ?? 0}
          </span>
        ),
        size: 70,
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <Link
            href={`/manuscripts/${row.original.historical_item}/images/${row.original.item_image}`}
            target="_blank"
          >
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        ),
        size: 50,
      },
    ],
    [t]
  );

  const [page, setPage] = useState(0);
  const [annotationType, setAnnotationType] = useState('__all');
  const [handFilter, setHandFilter] = useState('');
  const [allographFilter, setAllographFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GraphItem | null>(null);

  const filters = useMemo(() => {
    const params: Record<string, string | number> = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    };
    if (annotationType !== '__all') params.annotation_type = annotationType;
    if (handFilter.trim()) params.hand = Number(handFilter);
    if (allographFilter.trim()) params.allograph = Number(allographFilter);
    return params;
  }, [page, annotationType, handFilter, allographFilter]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: backofficeKeys.graphs.list(filters),
    queryFn: () => getGraphs(token!, filters),
    enabled: !!token,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteGraph(token!, id),
    onSuccess: () => {
      toast.success('Graph annotation deleted');
      queryClient.invalidateQueries({ queryKey: backofficeKeys.graphs.all() });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error('Failed to delete annotation', {
        description: formatApiError(err),
      });
    },
  });

  const graphs = data?.results ?? [];
  const totalCount = data?.count ?? 0;

  const bulkActions: BulkAction[] = [
    {
      label: 'Delete',
      variant: 'destructive',
      icon: <Trash2 className="h-3 w-3" />,
      action: async (ids) => {
        await runBulkAction({
          ids,
          action: (id) => deleteGraph(token!, Number(id)),
          invalidate: () =>
            queryClient.invalidateQueries({ queryKey: backofficeKeys.graphs.all() }),
          pastTense: 'deleted',
          noun: 'annotation',
        });
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ScanLine className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Annotations</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? '...' : totalCount.toLocaleString()} graph annotations
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Annotation Type</Label>
            <Select
              value={annotationType}
              onValueChange={(val) => {
                setAnnotationType(val);
                setPage(0);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANNOTATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hand ID</Label>
            <Input
              className="h-8 text-xs"
              placeholder="e.g. 42"
              value={handFilter}
              onChange={(e) => {
                setHandFilter(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Allograph ID</Label>
            <Input
              className="h-8 text-xs"
              placeholder="e.g. 15"
              value={allographFilter}
              onChange={(e) => {
                setAllographFilter(e.target.value);
                setPage(0);
              }}
            />
          </div>
        </div>
        {(annotationType !== '__all' || handFilter || allographFilter) && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs"
            onClick={() => {
              setAnnotationType('__all');
              setHandFilter('');
              setAllographFilter('');
              setPage(0);
            }}
          >
            Clear all filters
          </Button>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        isError={isError}
        onRetry={() => refetch()}
        columns={columns}
        data={graphs}
        pagination={false}
        enableRowSelection
        bulkActions={bulkActions}
        enableColumnVisibility
        enableExport
        exportFilename="annotations"
      />

      <ServerPagination
        total={totalCount}
        pageSize={PAGE_SIZE}
        page={page}
        hasNext={Boolean(data?.next)}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('annotations.deleteTitle')}
        description={
          deleteTarget
            ? t('annotations.deleteDesc', {
                id: deleteTarget.id,
                allograph: deleteTarget.allograph_name,
              })
            : ''
        }
        confirmLabel={t('annotations.deleteConfirm')}
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  );
}
