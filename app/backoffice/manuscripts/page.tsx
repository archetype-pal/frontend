'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { BookOpen, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, sortableHeader } from '@/components/backoffice/common/data-table';
import { getHistoricalItems } from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import type { HistoricalItemListItem } from '@/types/backoffice';
import { useModelLabels } from '@/contexts/model-labels-context';

export default function ManuscriptsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(0);
  const { getLabel, getPluralLabel } = useModelLabels();
  const historicalItemLabel = getLabel('historicalItem');
  const historicalItemPlural = getPluralLabel('historicalItem');
  const catalogueLabel = getLabel('catalogueNumber');
  const dateLabel = getLabel('date');
  const appManuscriptsLabel = getLabel('appManuscripts');
  const shelfmarkLabel = getLabel('fieldShelfmark');

  const columns = useMemo<ColumnDef<HistoricalItemListItem>[]>(
    () => [
      {
        accessorKey: 'location_display',
        header: sortableHeader(shelfmarkLabel),
        cell: ({ row }) => {
          const display =
            row.original.location_display ||
            row.original.catalogue_numbers_display ||
            `${historicalItemLabel} #${row.original.id}`;
          return (
            <Link
              href={`/backoffice/manuscripts/${row.original.id}`}
              className="font-medium text-primary hover:underline"
            >
              {display}
            </Link>
          );
        },
      },
      {
        accessorKey: 'repository_label',
        header: sortableHeader('Repository'),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.repository_label ?? '—'}
          </span>
        ),
        size: 80,
      },
      {
        accessorKey: 'type',
        header: sortableHeader('Type'),
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-xs">
            {row.original.type}
          </Badge>
        ),
        size: 100,
      },
      {
        accessorKey: 'date_display',
        header: sortableHeader(dateLabel),
        cell: ({ row }) => <span className="text-sm">{row.original.date_display ?? '—'}</span>,
        size: 120,
      },
      {
        accessorKey: 'catalogue_numbers_display',
        header: catalogueLabel,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.catalogue_numbers_display || '—'}
          </span>
        ),
        size: 140,
      },
      {
        accessorKey: 'image_count',
        header: sortableHeader('Images'),
        cell: ({ row }) => <span className="tabular-nums text-sm">{row.original.image_count}</span>,
        size: 70,
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <Link href={`/backoffice/manuscripts/${row.original.id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        ),
        size: 50,
      },
    ],
    [catalogueLabel, dateLabel, historicalItemLabel, shelfmarkLabel]
  );

  const { data } = useQuery({
    queryKey: backofficeKeys.manuscripts.list({ offset: page * 50 }),
    queryFn: () => getHistoricalItems(token!, { limit: 50, offset: page * 50 }),
    enabled: !!token,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{appManuscriptsLabel}</h1>
            <p className="text-sm text-muted-foreground">
              {data?.count ?? '...'} {historicalItemPlural.toLowerCase()} in the collection
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => router.push('/backoffice/manuscripts/new')}>
          <Plus className="h-4 w-4 mr-1" />
          New {historicalItemLabel}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        searchColumn="location_display"
        searchPlaceholder={`Search by shelfmark or ${catalogueLabel.toLowerCase()}...`}
        pageSize={50}
        enableColumnVisibility
        enableExport
        exportFilename="manuscripts"
      />

      {/* Server-side pagination controls */}
      {data && data.count > 50 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            Page {page + 1} of {Math.ceil(data.count / 50)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!data.next}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
