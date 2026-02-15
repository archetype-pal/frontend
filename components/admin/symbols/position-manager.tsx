'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InlineEdit } from '@/components/admin/common/inline-edit'
import { ConfirmDialog } from '@/components/admin/common/confirm-dialog'
import { adminKeys } from '@/lib/admin/query-keys'
import { formatApiError } from '@/lib/admin/format-api-error'
import {
  createPosition,
  updatePosition,
  deletePosition,
} from '@/services/admin/symbols'
import type { Position } from '@/types/admin'

interface PositionManagerProps {
  positions: Position[]
}

export function PositionManager({ positions }: PositionManagerProps) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: adminKeys.positions.all() })

  const createMut = useMutation({
    mutationFn: (name: string) => createPosition(token!, { name }),
    onSuccess: () => {
      invalidate()
      setNewName('')
      toast.success('Position created')
    },
    onError: (err) => {
      toast.error('Failed to create position', {
        description: formatApiError(err),
      })
    },
  })

  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      updatePosition(token!, id, { name }),
    onSuccess: () => {
      invalidate()
      toast.success('Position renamed')
    },
    onError: (err) => {
      toast.error('Failed to rename position', {
        description: formatApiError(err),
      })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deletePosition(token!, id),
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
      toast.success('Position deleted')
    },
    onError: (err) => {
      toast.error('Failed to delete position', {
        description: formatApiError(err),
      })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    createMut.mutate(newName.trim())
  }

  return (
    <div className='flex h-full flex-col'>
      <form onSubmit={handleCreate} className='flex items-center gap-1 p-3 pb-2'>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder='New position name...'
          className='h-8 text-sm'
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (newName.trim()) createMut.mutate(newName.trim())
            }
          }}
        />
        <Button
          type='submit'
          variant='outline'
          size='icon'
          className='h-8 w-8 shrink-0'
          disabled={!newName.trim() || createMut.isPending}
        >
          <Plus className='h-3.5 w-3.5' />
        </Button>
      </form>

      <div className='flex-1 overflow-y-auto px-3 pb-3'>
        {positions.length === 0 ? (
          <p className='text-center text-xs text-muted-foreground py-8'>
            No positions yet. Create one above.
          </p>
        ) : (
          <div className='space-y-0.5'>
            {positions.map((pos) => (
              <div
                key={pos.id}
                className='group flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent/50'
              >
                <InlineEdit
                  value={pos.name}
                  onSave={(name) => renameMut.mutate({ id: pos.id, name })}
                  className='flex-1 min-w-0'
                />
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive'
                  onClick={() => setDeleteTarget(pos)}
                >
                  <Trash2 className='h-3 w-3' />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description='This will remove the position from all annotations that reference it.'
        confirmLabel='Delete'
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  )
}
