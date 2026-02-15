'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import type { ColumnDef } from '@tanstack/react-table'
import { Ruler, Plus, Trash2 } from 'lucide-react'
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
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog'
import { getFormats, createFormat, deleteFormat } from '@/services/backoffice/manuscripts'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import { formatApiError } from '@/lib/backoffice/format-api-error'
import { toast } from 'sonner'
import type { ItemFormat } from '@/types/backoffice'

export default function FormatsPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ItemFormat | null>(null)
  const [newName, setNewName] = useState('')

  const { data: formats } = useQuery({
    queryKey: backofficeKeys.formats.all(),
    queryFn: () => getFormats(token!),
    enabled: !!token,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: backofficeKeys.formats.all() })

  const createMut = useMutation({
    mutationFn: () => createFormat(token!, { name: newName }),
    onSuccess: () => {
      toast.success('Format created')
      invalidate()
      setAddOpen(false)
      setNewName('')
    },
    onError: (err) => {
      toast.error('Failed to create format', { description: formatApiError(err) })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteFormat(token!, id),
    onSuccess: () => {
      toast.success('Format deleted')
      invalidate()
      setDeleteTarget(null)
    },
    onError: (err) => {
      toast.error('Failed to delete format', { description: formatApiError(err) })
    },
  })

  const columns: ColumnDef<ItemFormat>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <span className='tabular-nums text-muted-foreground'>
          #{row.original.id}
        </span>
      ),
      size: 60,
    },
    {
      accessorKey: 'name',
      header: sortableHeader('Name'),
      cell: ({ row }) => (
        <span className='font-medium'>{row.original.name}</span>
      ),
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

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-3'>
        <Ruler className='h-6 w-6 text-primary' />
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Formats</h1>
          <p className='text-sm text-muted-foreground'>
            Manage item formats for manuscript descriptions
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={formats ?? []}
        searchColumn='name'
        searchPlaceholder='Search formats...'
        toolbarActions={
          <Button size='sm' onClick={() => setAddOpen(true)}>
            <Plus className='h-4 w-4 mr-1' />
            New Format
          </Button>
        }
        pagination={false}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>New Format</DialogTitle>
          </DialogHeader>
          <div className='mt-2 space-y-1.5'>
            <Label>Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder='e.g. Codex, Roll'
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description='This may affect items that use this format.'
        confirmLabel='Delete'
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  )
}
