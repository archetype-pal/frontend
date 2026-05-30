'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Newspaper,
  Plus,
  ExternalLink,
  MessageSquare,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DataTable,
  sortableHeader,
  type BulkAction,
} from '@/components/backoffice/common/data-table';
import { FilterBar, type FilterConfig } from '@/components/backoffice/common/filter-bar';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { updatePublication, deletePublication } from '@/services/backoffice/publications';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { walkPaginated } from '@/lib/backoffice/walk-paginated';
import { authFetch } from '@/lib/api-fetch';
import { runBulkAction } from '@/lib/backoffice/bulk-action';
import type { PublicationListItem } from '@/types/backoffice';

const pubFilters: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'Draft', label: 'Draft' },
      { value: 'Published', label: 'Published' },
    ],
  },
  {
    key: 'type',
    label: 'Type',
    options: [
      { value: 'blog', label: 'Blog Post' },
      { value: 'news', label: 'News' },
      { value: 'featured', label: 'Featured' },
    ],
  },
];

const columns: ColumnDef<PublicationListItem>[] = [
  {
    accessorKey: 'title',
    header: sortableHeader('Title'),
    cell: ({ row }) => (
      <Link
        href={`/backoffice/publications/${row.original.slug}`}
        className="font-medium text-primary hover:underline line-clamp-1"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
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
    id: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const tags: string[] = [];
      if (row.original.is_blog_post) tags.push('Blog');
      if (row.original.is_news) tags.push('News');
      if (row.original.is_featured) tags.push('Featured');
      return (
        <div className="flex gap-1 flex-wrap">
          {tags.map((t) => (
            <Badge key={t} variant="outline" className="text-[10px]">
              {t}
            </Badge>
          ))}
        </div>
      );
    },
    size: 140,
  },
  {
    accessorKey: 'author_name',
    header: 'Author',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.author_name ?? '—'}</span>
    ),
    size: 100,
  },
  {
    accessorKey: 'comment_count',
    header: sortableHeader('Comments'),
    cell: ({ row }) =>
      row.original.comment_count > 0 ? (
        <Badge variant="secondary" className="text-xs gap-1">
          <MessageSquare className="h-3 w-3" />
          {row.original.comment_count}
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">0</span>
      ),
    size: 90,
  },
  {
    accessorKey: 'created_at',
    header: sortableHeader('Created'),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {new Date(row.original.created_at).toLocaleDateString()}
      </span>
    ),
    size: 100,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Link href={`/backoffice/publications/${row.original.slug}`}>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </Link>
    ),
    size: 50,
  },
];

export default function PublicationsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<{
    label: string;
    slugs: string[];
    execute: (slugs: string[]) => Promise<void>;
  } | null>(null);

  // Walk all pages so the client-side filter spans every publication.
  // The earlier `getPublications(token, { limit: 200 })` was silently
  // capped to 100 by DRF's BoundedLimitOffsetPagination, hiding row 101+
  // from this page (admins doing bulk publish/unpublish couldn't reach them).
  const { data, isError, refetch } = useQuery({
    queryKey: backofficeKeys.publications.all(),
    queryFn: () =>
      walkPaginated<PublicationListItem>(
        '/api/v1/media/management/publications/?limit=100',
        (path) => authFetch(path, token!)
      ),
    enabled: !!token,
  });

  // Client-side filtering
  const filtered = (data ?? []).filter((pub) => {
    if (filterValues.status && filterValues.status !== '__all') {
      if (pub.status !== filterValues.status) return false;
    }
    if (filterValues.type && filterValues.type !== '__all') {
      if (filterValues.type === 'blog' && !pub.is_blog_post) return false;
      if (filterValues.type === 'news' && !pub.is_news) return false;
      if (filterValues.type === 'featured' && !pub.is_featured) return false;
    }
    return true;
  });

  const invalidatePubs = () =>
    queryClient.invalidateQueries({ queryKey: backofficeKeys.publications.all() });

  const bulkActions: BulkAction[] = [
    {
      label: 'Publish',
      icon: <CheckCircle className="h-3 w-3" />,
      action: async (slugs) => {
        await runBulkAction({
          ids: slugs,
          action: (slug) => updatePublication(token!, slug, { status: 'Published' }),
          invalidate: invalidatePubs,
          pastTense: 'published',
          noun: 'publication',
        });
      },
    },
    {
      label: 'Unpublish',
      icon: <XCircle className="h-3 w-3" />,
      action: (slugs) => {
        setPendingBulkAction({
          label: 'Unpublish',
          slugs,
          execute: async (s) => {
            await runBulkAction({
              ids: s,
              action: (slug) => updatePublication(token!, slug, { status: 'Draft' }),
              invalidate: invalidatePubs,
              pastTense: 'unpublished',
              noun: 'publication',
            });
          },
        });
        setBulkConfirmOpen(true);
      },
    },
    {
      label: 'Delete',
      variant: 'destructive',
      icon: <Trash2 className="h-3 w-3" />,
      action: (slugs) => {
        setPendingBulkAction({
          label: 'Delete',
          slugs,
          execute: async (s) => {
            await runBulkAction({
              ids: s,
              action: (slug) => deletePublication(token!, slug),
              invalidate: invalidatePubs,
              pastTense: 'deleted',
              noun: 'publication',
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
          <Newspaper className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Publications</h1>
            <p className="text-sm text-muted-foreground">{data?.length ?? '...'} publications</p>
          </div>
        </div>
        <Button size="sm" onClick={() => router.push('/backoffice/publications/new')}>
          <Plus className="h-4 w-4 mr-1" />
          New Publication
        </Button>
      </div>

      <DataTable
        isError={isError}
        onRetry={() => refetch()}
        columns={columns}
        data={filtered}
        searchColumn="title"
        searchPlaceholder="Search publications..."
        pageSize={25}
        enableColumnVisibility
        enableExport
        exportFilename="publications"
        enableRowSelection
        bulkActions={bulkActions}
        getRowId={(row) => row.slug}
        filterBar={
          <FilterBar
            filters={pubFilters}
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
        title={`${pendingBulkAction?.label} ${pendingBulkAction?.slugs.length ?? 0} publication(s)?`}
        description={
          pendingBulkAction?.label === 'Delete'
            ? `${pendingBulkAction.slugs.length} publication(s) will be permanently deleted.`
            : `${pendingBulkAction?.slugs.length ?? 0} publication(s) will be unpublished.`
        }
        confirmLabel={`${pendingBulkAction?.label} All`}
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
