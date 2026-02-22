'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Users, Plus, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable, sortableHeader } from '@/components/backoffice/common/data-table'
import {
  getScribes,
  createScribe,
} from '@/services/backoffice/scribes'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import { formatApiError } from '@/lib/backoffice/format-api-error'
import { toast } from 'sonner'
import type { ScribeListItem } from '@/types/backoffice'

const columns: ColumnDef<ScribeListItem>[] = [
  {
    accessorKey: 'name',
    header: sortableHeader('Name'),
    cell: ({ row }) => (
      <Link
        href={`/backoffice/scribes/${row.original.id}`}
        className='font-medium text-primary hover:underline'
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'period_display',
    header: 'Period',
    cell: ({ row }) => (
      <span className='text-sm text-muted-foreground'>
        {row.original.period_display ?? '—'}
      </span>
    ),
    size: 120,
  },
  {
    accessorKey: 'scriptorium',
    header: 'Scriptorium',
    cell: ({ row }) => (
      <span className='text-sm text-muted-foreground'>
        {row.original.scriptorium || '—'}
      </span>
    ),
    size: 120,
  },
  {
    accessorKey: 'hand_count',
    header: sortableHeader('Hands'),
    cell: ({ row }) => (
      <Badge variant='secondary' className='text-xs tabular-nums'>
        {row.original.hand_count}
      </Badge>
    ),
    size: 80,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Link href={`/backoffice/scribes/${row.original.id}`}>
        <Button variant='ghost' size='icon' className='h-7 w-7'>
          <ExternalLink className='h-3.5 w-3.5' />
        </Button>
      </Link>
    ),
    size: 50,
  },
]

export default function ScribesPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')

  const { data } = useQuery({
    queryKey: backofficeKeys.scribes.all(),
    queryFn: () => getScribes(token!),
    enabled: !!token,
  })

  const createMut = useMutation({
    mutationFn: () => createScribe(token!, { name: newName }),
    onSuccess: () => {
      toast.success('Scribe created')
      queryClient.invalidateQueries({ queryKey: backofficeKeys.scribes.all() })
      setAddOpen(false)
      setNewName('')
    },
    onError: (err) => {
      toast.error('Failed to create scribe', {
        description: formatApiError(err),
      })
    },
  })

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-3'>
        <Users className='h-6 w-6 text-primary' />
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Scribes</h1>
          <p className='text-sm text-muted-foreground'>
            {data?.count ?? '...'} scribes
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        searchColumn='name'
        searchPlaceholder='Search scribes...'
        toolbarActions={
          <Button size='sm' onClick={() => setAddOpen(true)}>
            <Plus className='h-4 w-4 mr-1' />
            New Scribe
          </Button>
        }
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>New Scribe</DialogTitle>
          </DialogHeader>
          <div className='mt-2 space-y-1.5'>
            <Label>Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder='Scribe name'
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!newName.trim() || createMut.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
