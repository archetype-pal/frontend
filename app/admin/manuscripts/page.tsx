'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { BookOpen, Plus, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, sortableHeader } from '@/components/admin/common/data-table'
import { getHistoricalItems } from '@/services/admin/manuscripts'
import { adminKeys } from '@/lib/admin/query-keys'
import type { HistoricalItemListItem } from '@/types/admin'

const columns: ColumnDef<HistoricalItemListItem>[] = [
  {
    accessorKey: 'id',
    header: sortableHeader('ID'),
    cell: ({ row }) => (
      <span className='tabular-nums text-muted-foreground'>#{row.original.id}</span>
    ),
    size: 60,
  },
  {
    accessorKey: 'catalogue_numbers_display',
    header: sortableHeader('Catalogue'),
    cell: ({ row }) => (
      <Link
        href={`/admin/manuscripts/${row.original.id}`}
        className='font-medium text-primary hover:underline'
      >
        {row.original.catalogue_numbers_display || `Item #${row.original.id}`}
      </Link>
    ),
  },
  {
    accessorKey: 'type',
    header: sortableHeader('Type'),
    cell: ({ row }) => (
      <Badge variant='secondary' className='text-xs'>
        {row.original.type}
      </Badge>
    ),
    size: 100,
  },
  {
    accessorKey: 'date_display',
    header: sortableHeader('Date'),
    cell: ({ row }) => (
      <span className='text-sm'>{row.original.date_display ?? '—'}</span>
    ),
    size: 120,
  },
  {
    accessorKey: 'format_display',
    header: 'Format',
    cell: ({ row }) => (
      <span className='text-sm text-muted-foreground'>
        {row.original.format_display ?? '—'}
      </span>
    ),
    size: 100,
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
    cell: ({ row }) => (
      <Link href={`/admin/manuscripts/${row.original.id}`}>
        <Button variant='ghost' size='icon' className='h-7 w-7'>
          <ExternalLink className='h-3.5 w-3.5' />
        </Button>
      </Link>
    ),
    size: 50,
  },
]

export default function ManuscriptsPage() {
  const { token } = useAuth()
  const router = useRouter()
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: adminKeys.manuscripts.list({ offset: page * 50 }),
    queryFn: () =>
      getHistoricalItems(token!, { limit: 50, offset: page * 50 }),
    enabled: !!token,
  })

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <BookOpen className='h-6 w-6 text-primary' />
          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>
              Historical Items
            </h1>
            <p className='text-sm text-muted-foreground'>
              {data?.count ?? '...'} manuscripts in the collection
            </p>
          </div>
        </div>
        <Button size='sm' onClick={() => router.push('/admin/manuscripts/new')}>
          <Plus className='h-4 w-4 mr-1' />
          New Item
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        searchColumn='catalogue_numbers_display'
        searchPlaceholder='Search by catalogue number...'
        pageSize={50}
        enableColumnVisibility
        enableExport
        exportFilename='manuscripts'
      />

      {/* Server-side pagination controls */}
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
