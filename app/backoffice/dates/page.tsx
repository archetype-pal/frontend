'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarDays, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataTable, sortableHeader } from '@/components/backoffice/common/data-table'
import { InlineEdit } from '@/components/backoffice/common/inline-edit'
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog'
import { getDates, createDate, updateDate, deleteDate } from '@/services/backoffice/manuscripts'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import { formatApiError } from '@/lib/backoffice/format-api-error'
import { toast } from 'sonner'
import type { BackofficeDate } from '@/types/backoffice'

export default function DatesPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BackofficeDate | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newMin, setNewMin] = useState('')
  const [newMax, setNewMax] = useState('')

  const { data: dates, isLoading, isError, refetch } = useQuery({
    queryKey: backofficeKeys.dates.all(),
    queryFn: () => getDates(token!),
    enabled: !!token,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: backofficeKeys.dates.all() })

  const createMut = useMutation({
    mutationFn: () =>
      createDate(token!, {
        date: newDate,
        min_weight: Number(newMin) || 0,
        max_weight: Number(newMax) || 0,
      }),
    onSuccess: () => {
      toast.success('Date created')
      invalidate()
      setAddOpen(false)
      setNewDate('')
      setNewMin('')
      setNewMax('')
    },
    onError: (err) => {
      toast.error('Failed to create date', {
        description: formatApiError(err),
      })
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BackofficeDate> }) =>
      updateDate(token!, id, data),
    onSuccess: invalidate,
    onError: (err) => {
      toast.error('Failed to update date', {
        description: formatApiError(err),
      })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteDate(token!, id),
    onSuccess: () => {
      toast.success('Date deleted')
      invalidate()
      setDeleteTarget(null)
    },
    onError: (err) => {
      toast.error('Failed to delete date', {
        description: formatApiError(err),
      })
    },
  })

  const columns: ColumnDef<BackofficeDate>[] = [
    {
      accessorKey: 'date',
      header: sortableHeader('Date'),
      cell: ({ row }) => (
        <InlineEdit
          value={row.original.date}
          onSave={(date) =>
            updateMut.mutate({ id: row.original.id, data: { date } })
          }
        />
      ),
    },
    {
      accessorKey: 'min_weight',
      header: sortableHeader('Min Weight'),
      cell: ({ row }) => (
        <InlineEdit
          value={String(row.original.min_weight)}
          onSave={(val) =>
            updateMut.mutate({
              id: row.original.id,
              data: { min_weight: Number(val) || 0 },
            })
          }
        />
      ),
      size: 100,
    },
    {
      accessorKey: 'max_weight',
      header: sortableHeader('Max Weight'),
      cell: ({ row }) => (
        <InlineEdit
          value={String(row.original.max_weight)}
          onSave={(val) =>
            updateMut.mutate({
              id: row.original.id,
              data: { max_weight: Number(val) || 0 },
            })
          }
        />
      ),
      size: 100,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7 text-muted-foreground hover:text-destructive'
          onClick={() => setDeleteTarget(row.original)}
        >
          <Trash2 className='h-3.5 w-3.5' />
        </Button>
      ),
      size: 50,
    },
  ]

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (isError) {
    return (
      <div className='flex flex-col items-center justify-center py-20 gap-3'>
        <p className='text-sm text-destructive'>Failed to load dates</p>
        <Button variant='outline' size='sm' onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-3'>
        <CalendarDays className='h-6 w-6 text-primary' />
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Dates</h1>
          <p className='text-sm text-muted-foreground'>
            Manage date records used across historical items
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={dates ?? []}
        searchColumn='date'
        searchPlaceholder='Search dates...'
        toolbarActions={
          <Button size='sm' onClick={() => setAddOpen(true)}>
            <Plus className='h-4 w-4 mr-1' />
            New Date
          </Button>
        }
        pagination={false}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>New Date</DialogTitle>
          </DialogHeader>
          <div className='space-y-3 mt-2'>
            <div className='space-y-1.5'>
              <Label>Date string</Label>
              <Input
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                placeholder='e.g. s.xii'
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label>Min Weight</Label>
                <Input
                  type='number'
                  value={newMin}
                  onChange={(e) => setNewMin(e.target.value)}
                  placeholder='0'
                />
              </div>
              <div className='space-y-1.5'>
                <Label>Max Weight</Label>
                <Input
                  type='number'
                  value={newMax}
                  onChange={(e) => setNewMax(e.target.value)}
                  placeholder='0'
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!newDate.trim() || createMut.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.date}"?`}
        description='This may affect items that reference this date.'
        confirmLabel='Delete'
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  )
}
