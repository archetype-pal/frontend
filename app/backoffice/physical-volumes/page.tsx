'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import type { ColumnDef } from '@tanstack/react-table';
import { Archive } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, sortableHeader } from '@/components/backoffice/common/data-table';
import { ServerPagination } from '@/components/backoffice/common/server-pagination';
import { getCurrentItems, getRepositories } from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import type { CurrentItemOption, Repository } from '@/types/backoffice';
import { useModelLabels } from '@/contexts/model-labels-context';
import { useDebouncedSearch } from '@/hooks/backoffice/use-debounced-search';

export default function PhysicalVolumesPage() {
  const { token } = useAuth();
  const { getLabel } = useModelLabels();
  const [repoFilter, setRepoFilter] = useState<string>('__all');
  const { searchInput, setSearchInput, search, page, setPage } = useDebouncedSearch();
  const shelfmarkLabel = getLabel('fieldShelfmark');
  const appManuscriptsLabel = getLabel('appManuscripts');

  const columns: ColumnDef<CurrentItemOption>[] = [
    {
      accessorKey: 'repository_name',
      header: sortableHeader('Repository'),
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
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-1">
          {row.original.description || '—'}
        </span>
      ),
      size: 200,
    },
    {
      accessorKey: 'part_count',
      header: sortableHeader('Parts'),
      cell: ({ row }) => <span className="tabular-nums text-sm">{row.original.part_count}</span>,
      size: 70,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (row.original.part_count === 0) return null;
        return (
          <span className="text-xs text-muted-foreground">{`Linked to ${appManuscriptsLabel.toLowerCase()}`}</span>
        );
      },
      size: 120,
    },
  ];

  const { data: repositoriesData } = useQuery({
    queryKey: backofficeKeys.repositories.all(),
    queryFn: () => getRepositories(token!),
    enabled: !!token,
  });

  const repositories: Repository[] = !repositoriesData
    ? []
    : Array.isArray(repositoriesData)
      ? repositoriesData
      : repositoriesData.results;

  const filterParams = {
    ...(repoFilter !== '__all' ? { repository: Number(repoFilter) } : {}),
    ...(search ? { search } : {}),
    limit: 50,
    offset: page * 50,
  };

  const { data } = useQuery({
    queryKey: backofficeKeys.currentItems.list(filterParams),
    queryFn: () => getCurrentItems(token!, filterParams),
    enabled: !!token,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Archive className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Physical Volumes</h1>
            <p className="text-sm text-muted-foreground">
              {data?.count ?? '...'} volumes across {repositories.length} repositories
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={repoFilter}
            onValueChange={(v) => {
              setRepoFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[220px] h-9">
              <SelectValue placeholder="All repositories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All repositories</SelectItem>
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
        columns={columns}
        data={data?.results ?? []}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={`Search by ${shelfmarkLabel.toLowerCase()}...`}
        pagination={false}
        enableColumnVisibility
        enableExport
        exportFilename="physical-volumes"
      />

      {data && (
        <ServerPagination
          total={data.count}
          pageSize={50}
          page={page}
          hasNext={!!data.next}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
