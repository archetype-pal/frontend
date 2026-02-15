'use client'

import { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { InlineEdit } from '@/components/admin/common/inline-edit'
import { ConfirmDialog } from '@/components/admin/common/confirm-dialog'
import { adminKeys } from '@/lib/admin/query-keys'
import { formatApiError } from '@/lib/admin/format-api-error'
import {
  createFeature,
  updateFeature,
  deleteFeature,
} from '@/services/admin/symbols'
import type { Feature, Component } from '@/types/admin'

interface FeatureManagerProps {
  features: Feature[]
  /** All components, used to compute reverse usage counts. */
  components?: Component[]
}

export function FeatureManager({ features, components = [] }: FeatureManagerProps) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Feature | null>(null)

  // Compute how many components link each feature
  const usageMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const comp of components) {
      for (const fId of comp.features) {
        map.set(fId, (map.get(fId) ?? 0) + 1)
      }
    }
    return map
  }, [components])

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: adminKeys.features.all() })

  const createMut = useMutation({
    mutationFn: (name: string) => createFeature(token!, { name }),
    onSuccess: () => {
      invalidate()
      setNewName('')
      toast.success('Feature created')
    },
    onError: (err) => {
      toast.error('Failed to create feature', {
        description: formatApiError(err),
      })
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
      toast.success('Feature deleted')
    },
    onError: (err) => {
      toast.error('Failed to delete feature', {
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
          placeholder='New feature name...'
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
        {features.length === 0 ? (
          <p className='text-center text-xs text-muted-foreground py-8'>
            No features yet. Create one above.
          </p>
        ) : (
          <div className='space-y-0.5'>
            {features.map((feat) => {
              const usage = usageMap.get(feat.id) ?? 0
              return (
                <div
                  key={feat.id}
                  className='group flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent/50'
                >
                  <InlineEdit
                    value={feat.name}
                    onSave={(name) =>
                      renameMut.mutate({ id: feat.id, name })
                    }
                    className='flex-1 min-w-0'
                  />
                  <div className='flex items-center gap-0.5'>
                    {usage > 0 && (
                      <Badge
                        variant='secondary'
                        className='text-[10px] px-1.5 h-4 tabular-nums'
                        title={`Used by ${usage} component${usage !== 1 ? 's' : ''}`}
                      >
                        {usage}c
                      </Badge>
                    )}
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive'
                      onClick={() => setDeleteTarget(feat)}
                    >
                      <Trash2 className='h-3 w-3' />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

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
