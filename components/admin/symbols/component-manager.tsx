'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { InlineEdit } from '@/components/admin/common/inline-edit'
import { ConfirmDialog } from '@/components/admin/common/confirm-dialog'
import {
  createComponent,
  updateComponent,
  deleteComponent,
} from '@/services/admin/symbols'
import type { Component, Feature } from '@/types/admin'

interface ComponentManagerProps {
  components: Component[]
  allFeatures: Feature[]
}

export function ComponentManager({
  components,
  allFeatures,
}: ComponentManagerProps) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Component | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'components'] })

  const createMut = useMutation({
    mutationFn: (name: string) => createComponent(token!, { name }),
    onSuccess: () => {
      invalidate()
      setNewName('')
    },
  })

  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      updateComponent(token!, id, { name }),
    onSuccess: invalidate,
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteComponent(token!, id),
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
        Components
      </h4>

      <div className='max-h-48 overflow-y-auto space-y-0.5'>
        {components.map((comp) => (
          <div
            key={comp.id}
            className='group flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent/50'
          >
            <InlineEdit
              value={comp.name}
              onSave={(name) => renameMut.mutate({ id: comp.id, name })}
              className='flex-1 min-w-0'
            />
            <div className='flex items-center gap-0.5'>
              {comp.features.length > 0 && (
                <Badge variant='secondary' className='text-[10px] px-1 h-4'>
                  {comp.features.length}f
                </Badge>
              )}
              <Button
                variant='ghost'
                size='icon'
                className='h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive'
                onClick={() => setDeleteTarget(comp)}
              >
                <Trash2 className='h-3 w-3' />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleCreate} className='flex items-center gap-1'>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder='New component...'
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
        description='This will remove the component from all allographs that use it.'
        confirmLabel='Delete'
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  )
}
