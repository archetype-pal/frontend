'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import type { ColumnDef } from '@tanstack/react-table'
import { BookMarked, Plus, Trash2 } from 'lucide-react'
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
import { DataTable, sortableHeader } from '@/components/admin/common/data-table'
import { ConfirmDialog } from '@/components/admin/common/confirm-dialog'
import { getSources, createSource, deleteSource } from '@/services/admin/manuscripts'
import type { BibliographicSource } from '@/types/admin'

export default function SourcesPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BibliographicSource | null>(null)
  const [newName, setNewName] = useState('')
  const [newLabel, setNewLabel] = useState('')

  const { data: sources } = useQuery({
    queryKey: ['admin', 'sources'],
    queryFn: () => getSources(token!),
    enabled: !!token,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'sources'] })

  const createMut = useMutation({
    mutationFn: () =>
      createSource(token!, { name: newName, label: newLabel }),
    onSuccess: () => {
      invalidate()
      setAddOpen(false)
      setNewName('')
      setNewLabel('')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteSource(token!, id),
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
    },
  })

  const columns: ColumnDef<BibliographicSource>[] = [
    {
      accessorKey: 'name',
      header: sortableHeader('Name'),
      cell: ({ row }) => (
        <span className='font-medium'>{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'label',
      header: sortableHeader('Label'),
      cell: ({ row }) => (
        <span className='text-sm text-muted-foreground'>
          {row.original.label}
        </span>
      ),
      size: 150,
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
        <BookMarked className='h-6 w-6 text-primary' />
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            Bibliographic Sources
          </h1>
          <p className='text-sm text-muted-foreground'>
            Manage bibliographic source records
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={sources ?? []}
        searchColumn='name'
        searchPlaceholder='Search sources...'
        toolbarActions={
          <Button size='sm' onClick={() => setAddOpen(true)}>
            <Plus className='h-4 w-4 mr-1' />
            New Source
          </Button>
        }
        pagination={false}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>New Bibliographic Source</DialogTitle>
          </DialogHeader>
          <div className='space-y-3 mt-2'>
            <div className='space-y-1.5'>
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder='Full source name'
                autoFocus
              />
            </div>
            <div className='space-y-1.5'>
              <Label>Label / Abbreviation</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder='Short label'
              />
            </div>
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
        description='This may affect items that reference this source.'
        confirmLabel='Delete'
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  )
}
