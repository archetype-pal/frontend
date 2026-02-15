'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Newspaper, Plus, Trash2, ExternalLink, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, sortableHeader } from '@/components/admin/common/data-table'
import { ConfirmDialog } from '@/components/admin/common/confirm-dialog'
import {
  getPublications,
  deletePublication,
} from '@/services/admin/publications'
import type { PublicationListItem } from '@/types/admin'

const columns: ColumnDef<PublicationListItem>[] = [
  {
    accessorKey: 'title',
    header: sortableHeader('Title'),
    cell: ({ row }) => (
      <Link
        href={`/admin/publications/${row.original.slug}`}
        className='font-medium text-primary hover:underline line-clamp-1'
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
        className='text-xs'
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
      const tags: string[] = []
      if (row.original.is_blog_post) tags.push('Blog')
      if (row.original.is_news) tags.push('News')
      if (row.original.is_featured) tags.push('Featured')
      return (
        <div className='flex gap-1 flex-wrap'>
          {tags.map((t) => (
            <Badge key={t} variant='outline' className='text-[10px]'>
              {t}
            </Badge>
          ))}
        </div>
      )
    },
    size: 140,
  },
  {
    accessorKey: 'author_name',
    header: 'Author',
    cell: ({ row }) => (
      <span className='text-sm text-muted-foreground'>
        {row.original.author_name ?? '—'}
      </span>
    ),
    size: 100,
  },
  {
    accessorKey: 'comment_count',
    header: sortableHeader('Comments'),
    cell: ({ row }) =>
      row.original.comment_count > 0 ? (
        <Badge variant='secondary' className='text-xs gap-1'>
          <MessageSquare className='h-3 w-3' />
          {row.original.comment_count}
        </Badge>
      ) : (
        <span className='text-xs text-muted-foreground'>0</span>
      ),
    size: 90,
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
      <Link href={`/admin/publications/${row.original.slug}`}>
        <Button variant='ghost' size='icon' className='h-7 w-7'>
          <ExternalLink className='h-3.5 w-3.5' />
        </Button>
      </Link>
    ),
    size: 50,
  },
]

export default function PublicationsPage() {
  const { token } = useAuth()
  const router = useRouter()

  const { data } = useQuery({
    queryKey: ['admin', 'publications'],
    queryFn: () => getPublications(token!, { limit: 200 }),
    enabled: !!token,
  })

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Newspaper className='h-6 w-6 text-primary' />
          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>
              Publications
            </h1>
            <p className='text-sm text-muted-foreground'>
              {data?.count ?? '...'} publications
            </p>
          </div>
        </div>
        <Button
          size='sm'
          onClick={() => router.push('/admin/publications/new')}
        >
          <Plus className='h-4 w-4 mr-1' />
          New Publication
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        searchColumn='title'
        searchPlaceholder='Search publications...'
        pageSize={25}
      />
    </div>
  )
}
