'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InlineEdit } from '@/components/admin/common/inline-edit'
import { ConfirmDialog } from '@/components/admin/common/confirm-dialog'
import {
  createFeature,
  updateFeature,
  deleteFeature,
} from '@/services/admin/symbols'
import type { Feature } from '@/types/admin'

interface FeatureManagerProps {
  features: Feature[]
}

export function FeatureManager({ features }: FeatureManagerProps) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Feature | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'features'] })

  const createMut = useMutation({
    mutationFn: (name: string) => createFeature(token!, { name }),
    onSuccess: () => {
      invalidate()
      setNewName('')
    },
  })

  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      updateFeature(token!, id, { name }),
    onSuccess: invalidate,
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteFeature(token!, id),
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    createMut.mutate(newName.trim())
  }

  return (
    <div className='space-y-2'>
      <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1'>
        Features
      </h4>

      <div className='max-h-48 overflow-y-auto space-y-0.5'>
        {features.map((feat) => (
          <div
            key={feat.id}
            className='group flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent/50'
          >
            <InlineEdit
              value={feat.name}
              onSave={(name) => renameMut.mutate({ id: feat.id, name })}
              className='flex-1 min-w-0'
            />
            <Button
              variant='ghost'
              size='icon'
              className='h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive'
              onClick={() => setDeleteTarget(feat)}
            >
              <Trash2 className='h-3 w-3' />
            </Button>
          </div>
        ))}
      </div>

      <form onSubmit={handleCreate} className='flex items-center gap-1'>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder='New feature...'
          className='h-7 text-xs'
        />
        <Button
          type='submit'
          variant='ghost'
          size='icon'
          className='h-7 w-7 shrink-0'
          disabled={!newName.trim() || createMut.isPending}
        >
          <Plus className='h-3.5 w-3.5' />
        </Button>
      </form>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description='This will remove the feature from all components and allographs that reference it.'
        confirmLabel='Delete'
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  )
}
