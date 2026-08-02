'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { Files, Plus, ExternalLink, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DataTable,
  sortableHeader,
  type BulkAction,
} from '@/components/backoffice/common/data-table';
import { FilterBar, type FilterConfig } from '@/components/backoffice/common/filter-bar';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { getPages, updatePage, deletePage } from '@/services/backoffice/pages';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { runBulkAction } from '@/lib/backoffice/bulk-action';
import { resolvePageText, type PageListItem } from '@/lib/pages';

export default function PagesPage() {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const pageFilters: FilterConfig[] = [
    {
      key: 'status',
      label: t('pages.filterStatus'),
      options: [
        { value: 'Draft', label: t('pages.filterDraft') },
        { value: 'Published', label: t('pages.filterPublished') },
      ],
    },
  ];

  const columns: ColumnDef<PageListItem>[] = [
    {
      id: 'title',
      header: t('pages.colTitle'),
      accessorFn: (row) => resolvePageText(row.title, 'en'),
      cell: ({ row }) => (
        <Link
          href={`/backoffice/pages/${row.original.slug}`}
          className="font-medium text-primary hover:underline line-clamp-1"
        >
          {resolvePageText(row.original.title, 'en') || row.original.slug}
        </Link>
      ),
    },
    {
      accessorKey: 'slug',
      header: t('pages.colSlug'),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">/about/{row.original.slug}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: t('pages.colStatus'),
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'Published' ? 'default' : 'secondary'}
          className="text-xs"
        >
          {row.original.status}
        </Badge>
      ),
      size: 90,
    },
    {
      accessorKey: 'order',
      header: sortableHeader(t('pages.colOrder')),
      cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.order}</span>,
      size: 70,
    },
    {
      accessorKey: 'include_in_quick_link',
      header: t('pages.colQuickLink'),
      cell: ({ row }) =>
        row.original.include_in_quick_link ? (
          <Badge variant="outline" className="text-[10px]">
            {t('pages.yes')}
          </Badge>
        ) : null,
      size: 90,
    },
    {
      accessorKey: 'updated_at',
      header: sortableHeader(t('pages.colUpdated')),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {row.original.updated_at ? new Date(row.original.updated_at).toLocaleDateString() : '—'}
        </span>
      ),
      size: 100,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Link href={`/about/${row.original.slug}`} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>
      ),
      size: 50,
    },
  ];

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<{
    label: string;
    slugs: string[];
    execute: (slugs: string[]) => Promise<void>;
  } | null>(null);

  const { data, isError, refetch } = useQuery({
    queryKey: backofficeKeys.pages.list(),
    queryFn: () => getPages(token!),
    enabled: !!token,
  });

  const filtered = (data ?? []).filter((page) => {
    if (
      filterValues.status &&
      filterValues.status !== '__all' &&
      page.status !== filterValues.status
    ) {
      return false;
    }
    return true;
  });

  const invalidatePages = () =>
    queryClient.invalidateQueries({ queryKey: backofficeKeys.pages.all() });

  const bulkActions: BulkAction[] = [
    {
      label: t('pages.bulkPublish'),
      icon: <CheckCircle className="h-3 w-3" />,
      action: async (slugs) => {
        await runBulkAction({
          ids: slugs,
          action: (slug) => updatePage(token!, slug, { status: 'Published' }),
          invalidate: invalidatePages,
          pastTense: 'published',
          noun: 'page',
        });
      },
    },
    {
      label: t('pages.bulkUnpublish'),
      icon: <XCircle className="h-3 w-3" />,
      action: (slugs) => {
        setPendingBulkAction({
          label: t('pages.bulkUnpublish'),
          slugs,
          execute: async (s) => {
            await runBulkAction({
              ids: s,
              action: (slug) => updatePage(token!, slug, { status: 'Draft' }),
              invalidate: invalidatePages,
              pastTense: 'unpublished',
              noun: 'page',
            });
          },
        });
        setBulkConfirmOpen(true);
      },
    },
    {
      label: t('pages.bulkDelete'),
      variant: 'destructive',
      icon: <Trash2 className="h-3 w-3" />,
      action: (slugs) => {
        setPendingBulkAction({
          label: t('pages.bulkDelete'),
          slugs,
          execute: async (s) => {
            await runBulkAction({
              ids: s,
              action: (slug) => deletePage(token!, slug),
              invalidate: invalidatePages,
              pastTense: 'deleted',
              noun: 'page',
            });
          },
        });
        setBulkConfirmOpen(true);
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Files className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('pages.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('pages.subtitle', { count: data?.length ?? 0 })}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => router.push('/backoffice/pages/new')}>
          <Plus className="h-4 w-4 mr-1" />
          {t('pages.newButton')}
        </Button>
      </div>

      <DataTable
        isError={isError}
        onRetry={() => refetch()}
        columns={columns}
        data={filtered}
        searchColumn="title"
        searchPlaceholder={t('pages.searchPlaceholder')}
        pageSize={25}
        enableColumnVisibility
        enableRowSelection
        bulkActions={bulkActions}
        getRowId={(row) => row.slug}
        filterBar={
          <FilterBar
            filters={pageFilters}
            values={filterValues}
            onChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
            onClear={() => setFilterValues({})}
          />
        }
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBulkConfirmOpen(false);
            setPendingBulkAction(null);
          }
        }}
        title={t('pages.bulkConfirmTitle', {
          label: pendingBulkAction?.label ?? '',
          count: pendingBulkAction?.slugs.length ?? 0,
        })}
        description={
          pendingBulkAction?.label === t('pages.bulkDelete')
            ? t('pages.bulkConfirmDescDelete', { count: pendingBulkAction.slugs.length })
            : t('pages.bulkConfirmDescUnpublish', { count: pendingBulkAction?.slugs.length ?? 0 })
        }
        confirmLabel={t('pages.bulkConfirmLabel', { label: pendingBulkAction?.label ?? '' })}
        onConfirm={async () => {
          if (pendingBulkAction) {
            await pendingBulkAction.execute(pendingBulkAction.slugs);
          }
          setBulkConfirmOpen(false);
          setPendingBulkAction(null);
        }}
      />
    </div>
  );
}
