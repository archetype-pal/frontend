'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { PenTool, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, sortableHeader } from '@/components/backoffice/common/data-table';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { walkPaginated } from '@/lib/backoffice/walk-paginated';
import { authFetch } from '@/lib/api-fetch';
import type { HandListItem } from '@/types/backoffice';

const columns: ColumnDef<HandListItem>[] = [
  {
    accessorKey: 'name',
    header: sortableHeader('Name'),
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
    header: sortableHeader('Scribe'),
    cell: ({ row }) => (
      <Link href={`/backoffice/scribes/${row.original.scribe}`} className="text-sm hover:underline">
        {row.original.scribe_name}
      </Link>
    ),
    size: 120,
  },
  {
    accessorKey: 'item_part_display',
    header: 'Item Part',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground truncate">
        {row.original.item_part_display}
      </span>
    ),
  },
  {
    accessorKey: 'script_name',
    header: 'Script',
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
    header: 'Date',
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

export default function HandsPage() {
  const { token } = useAuth();

  // The earlier `getHands(token)` returned only the first DRF page (20),
  // but the header showed `data.count` — admins saw "150 hands" with only
  // 20 rows visible. Walk all pages so the count and the table agree, and
  // client-side search/pagination on the DataTable spans the full set.
  const { data } = useQuery({
    queryKey: backofficeKeys.hands.all(),
    queryFn: () =>
      walkPaginated<HandListItem>('/api/v1/management/scribes/hands/?limit=100', (path) =>
        authFetch(path, token!)
      ),
    enabled: !!token,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <PenTool className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hands</h1>
          <p className="text-sm text-muted-foreground">{data?.length ?? '...'} hands</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        searchColumn="name"
        searchPlaceholder="Search hands..."
        pageSize={25}
      />
    </div>
  );
}
