'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Newspaper, Plus, ExternalLink, MessageSquare, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, sortableHeader, type BulkAction } from '@/components/backoffice/common/data-table'
import { FilterBar, type FilterConfig } from '@/components/backoffice/common/filter-bar'
import { getPublications, updatePublication, deletePublication } from '@/services/backoffice/publications'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import type { PublicationListItem } from '@/types/backoffice'
import { toast } from 'sonner'

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
]

const columns: ColumnDef<PublicationListItem>[] = [
  {
    accessorKey: 'title',
    header: sortableHeader('Title'),
    cell: ({ row }) => (
      <Link
        href={`/backoffice/publications/${row.original.slug}`}
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
      <Link href={`/backoffice/publications/${row.original.slug}`}>
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
  const queryClient = useQueryClient()
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  const { data } = useQuery({
    queryKey: backofficeKeys.publications.all(),
    queryFn: () => getPublications(token!, { limit: 200 }),
    enabled: !!token,
  })

  // Client-side filtering
  const filtered = (data?.results ?? []).filter((pub) => {
    if (filterValues.status && filterValues.status !== '__all') {
      if (pub.status !== filterValues.status) return false
    }
    if (filterValues.type && filterValues.type !== '__all') {
      if (filterValues.type === 'blog' && !pub.is_blog_post) return false
      if (filterValues.type === 'news' && !pub.is_news) return false
      if (filterValues.type === 'featured' && !pub.is_featured) return false
    }
    return true
  })

  const allPubs = data?.results ?? []

  const bulkActions: BulkAction[] = [
    {
      label: 'Publish',
      icon: <CheckCircle className='h-3 w-3' />,
      action: async (slugs) => {
        try {
          await Promise.all(
            slugs.map((slug) =>
              updatePublication(token!, slug, { status: 'Published' })
            )
          )
          toast.success(`${slugs.length} publication(s) published`)
          queryClient.invalidateQueries({ queryKey: backofficeKeys.publications.all() })
        } catch {
          toast.error('Failed to publish some publications')
        }
      },
    },
    {
      label: 'Unpublish',
      icon: <XCircle className='h-3 w-3' />,
      action: async (slugs) => {
        try {
          await Promise.all(
            slugs.map((slug) =>
              updatePublication(token!, slug, { status: 'Draft' })
            )
          )
          toast.success(`${slugs.length} publication(s) unpublished`)
          queryClient.invalidateQueries({ queryKey: backofficeKeys.publications.all() })
        } catch {
          toast.error('Failed to unpublish some publications')
        }
      },
    },
    {
      label: 'Delete',
      variant: 'destructive',
      icon: <Trash2 className='h-3 w-3' />,
      action: async (slugs) => {
        try {
          await Promise.all(
            slugs.map((slug) => deletePublication(token!, slug))
          )
          toast.success(`${slugs.length} publication(s) deleted`)
          queryClient.invalidateQueries({ queryKey: backofficeKeys.publications.all() })
        } catch {
          toast.error('Failed to delete some publications')
        }
      },
    },
  ]

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
          onClick={() => router.push('/backoffice/publications/new')}
        >
          <Plus className='h-4 w-4 mr-1' />
          New Publication
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchColumn='title'
        searchPlaceholder='Search publications...'
        pageSize={25}
        enableColumnVisibility
        enableExport
        exportFilename='publications'
        enableRowSelection
        bulkActions={bulkActions}
        getRowId={(row) => row.slug}
        filterBar={
          <FilterBar
            filters={pubFilters}
            values={filterValues}
            onChange={(key, value) =>
              setFilterValues((prev) => ({ ...prev, [key]: value }))
            }
            onClear={() => setFilterValues({})}
          />
        }
      />
    </div>
  )
}
