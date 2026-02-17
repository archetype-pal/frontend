'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Archive, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable, sortableHeader } from '@/components/backoffice/common/data-table'
import { getCurrentItems, getRepositories } from '@/services/backoffice/manuscripts'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import type { CurrentItemOption, Repository } from '@/types/backoffice'

const columns: ColumnDef<CurrentItemOption>[] = [
  {
    accessorKey: 'repository_name',
    header: sortableHeader('Repository'),
    cell: ({ row }) => (
      <span className='text-sm font-medium'>
        {row.original.repository_name}
      </span>
    ),
    size: 120,
  },
  {
    accessorKey: 'shelfmark',
    header: sortableHeader('Shelfmark'),
    cell: ({ row }) => (
      <span className='text-sm'>{row.original.shelfmark}</span>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <span className='text-sm text-muted-foreground line-clamp-1'>
        {row.original.description || '—'}
      </span>
    ),
    size: 200,
  },
  {
    accessorKey: 'part_count',
    header: sortableHeader('Parts'),
    cell: ({ row }) => (
      <span className='tabular-nums text-sm'>{row.original.part_count}</span>
    ),
    size: 70,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      if (row.original.part_count === 0) return null
      return (
        <span className='text-xs text-muted-foreground'>
          Linked to manuscripts
        </span>
      )
    },
    size: 120,
  },
]

export default function PhysicalVolumesPage() {
  const { token } = useAuth()
  const [repoFilter, setRepoFilter] = useState<string>('__all')
  const [page, setPage] = useState(0)

  const { data: repositoriesData } = useQuery({
    queryKey: backofficeKeys.repositories.all(),
    queryFn: () => getRepositories(token!),
    enabled: !!token,
  })

  const repositories: Repository[] = repositoriesData?.results ?? repositoriesData ?? []

  const filterParams = {
    ...(repoFilter !== '__all' ? { repository: Number(repoFilter) } : {}),
    limit: 50,
    offset: page * 50,
  }

  const { data, isLoading } = useQuery({
    queryKey: backofficeKeys.currentItems.list(filterParams),
    queryFn: () => getCurrentItems(token!, filterParams),
    enabled: !!token,
  })

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Archive className='h-6 w-6 text-primary' />
          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>
              Physical Volumes
            </h1>
            <p className='text-sm text-muted-foreground'>
              {data?.count ?? '...'} volumes across {repositories.length} repositories
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Select value={repoFilter} onValueChange={(v) => { setRepoFilter(v); setPage(0) }}>
            <SelectTrigger className='w-[220px] h-9'>
              <SelectValue placeholder='All repositories' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all'>All repositories</SelectItem>
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
        searchColumn='shelfmark'
        searchPlaceholder='Search by shelfmark...'
        pageSize={50}
        enableColumnVisibility
        enableExport
        exportFilename='physical-volumes'
      />

      {data && data.count > 50 && (
        <div className='flex items-center justify-center gap-2 pt-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className='text-sm text-muted-foreground tabular-nums'>
            Page {page + 1} of {Math.ceil(data.count / 50)}
          </span>
          <Button
            variant='outline'
            size='sm'
            disabled={!data.next}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
