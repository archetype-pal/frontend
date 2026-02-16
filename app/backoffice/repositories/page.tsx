'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import type { ColumnDef } from '@tanstack/react-table'
import { Building2, Plus, Trash2, Loader2 } from 'lucide-react'
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
import {
  getRepositories,
  createRepository,
  updateRepository,
  deleteRepository,
} from '@/services/backoffice/manuscripts'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import { formatApiError } from '@/lib/backoffice/format-api-error'
import { toast } from 'sonner'
import type { Repository } from '@/types/backoffice'

export default function RepositoriesPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Repository | null>(null)
  const [newName, setNewName] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newPlace, setNewPlace] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: backofficeKeys.repositories.all(),
    queryFn: () => getRepositories(token!),
    enabled: !!token,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: backofficeKeys.repositories.all() })

  const createMut = useMutation({
    mutationFn: () =>
      createRepository(token!, {
        name: newName,
        label: newLabel,
        place: newPlace,
        url: null,
        type: null,
      }),
    onSuccess: () => {
      toast.success('Repository created')
      invalidate()
      setAddOpen(false)
      setNewName('')
      setNewLabel('')
      setNewPlace('')
    },
    onError: (err) => {
      toast.error('Failed to create repository', {
        description: formatApiError(err),
      })
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data: d }: { id: number; data: Partial<Repository> }) =>
      updateRepository(token!, id, d),
    onSuccess: invalidate,
    onError: (err) => {
      toast.error('Failed to update repository', {
        description: formatApiError(err),
      })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteRepository(token!, id),
    onSuccess: () => {
      toast.success('Repository deleted')
      invalidate()
      setDeleteTarget(null)
    },
    onError: (err) => {
      toast.error('Failed to delete repository', {
        description: formatApiError(err),
      })
    },
  })

  const columns: ColumnDef<Repository>[] = [
    {
      accessorKey: 'name',
      header: sortableHeader('Name'),
      cell: ({ row }) => (
        <InlineEdit
          value={row.original.name}
          onSave={(name) =>
            updateMut.mutate({ id: row.original.id, data: { name } })
          }
        />
      ),
    },
    {
      accessorKey: 'label',
      header: sortableHeader('Label'),
      cell: ({ row }) => (
        <InlineEdit
          value={row.original.label}
          onSave={(label) =>
            updateMut.mutate({ id: row.original.id, data: { label } })
          }
        />
      ),
    },
    {
      accessorKey: 'place',
      header: sortableHeader('Place'),
      cell: ({ row }) => (
        <InlineEdit
          value={row.original.place}
          onSave={(place) =>
            updateMut.mutate({ id: row.original.id, data: { place } })
          }
        />
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
        <p className='text-sm text-destructive'>Failed to load repositories</p>
        <Button variant='outline' size='sm' onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-3'>
        <Building2 className='h-6 w-6 text-primary' />
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            Repositories
          </h1>
          <p className='text-sm text-muted-foreground'>
            Manage institutional repositories
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        searchColumn='name'
        searchPlaceholder='Search repositories...'
        toolbarActions={
          <Button size='sm' onClick={() => setAddOpen(true)}>
            <Plus className='h-4 w-4 mr-1' />
            New Repository
          </Button>
        }
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>New Repository</DialogTitle>
          </DialogHeader>
          <div className='space-y-3 mt-2'>
            <div className='space-y-1.5'>
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder='British Library'
              />
            </div>
            <div className='space-y-1.5'>
              <Label>Label / Abbreviation</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder='BL'
              />
            </div>
            <div className='space-y-1.5'>
              <Label>Place</Label>
              <Input
                value={newPlace}
                onChange={(e) => setNewPlace(e.target.value)}
                placeholder='London'
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
        description='This may affect historical items that reference this repository.'
        confirmLabel='Delete'
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  )
}
