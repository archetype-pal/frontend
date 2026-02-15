'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Calendar, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, sortableHeader } from '@/components/admin/common/data-table'
import { getEvents } from '@/services/admin/publications'
import type { EventItem } from '@/types/admin'

const columns: ColumnDef<EventItem>[] = [
  {
    accessorKey: 'title',
    header: sortableHeader('Title'),
    cell: ({ row }) => (
      <Link
        href={`/admin/events/${row.original.slug}`}
        className='font-medium text-primary hover:underline'
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => (
      <span className='text-sm text-muted-foreground font-mono'>
        {row.original.slug}
      </span>
    ),
    size: 150,
  },
  {
    accessorKey: 'created_at',
    header: sortableHeader('Created'),
    cell: ({ row }) => (
      <span className='text-xs text-muted-foreground tabular-nums'>
        {new Date(row.original.created_at).toLocaleDateString()}
      </span>
    ),
    size: 100,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Link href={`/admin/events/${row.original.slug}`}>
        <Button variant='ghost' size='icon' className='h-7 w-7'>
          <ExternalLink className='h-3.5 w-3.5' />
        </Button>
      </Link>
    ),
    size: 50,
  },
]

export default function EventsPage() {
  const { token } = useAuth()

  const { data } = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: () => getEvents(token!),
    enabled: !!token,
  })

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-3'>
        <Calendar className='h-6 w-6 text-primary' />
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Events</h1>
          <p className='text-sm text-muted-foreground'>
            {data?.count ?? '...'} events
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        searchColumn='title'
        searchPlaceholder='Search events...'
      />
    </div>
  )
}
