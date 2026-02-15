'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { InlineEdit } from '@/components/backoffice/common/inline-edit'
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import { formatApiError } from '@/lib/backoffice/format-api-error'
import {
  createComponent,
  updateComponent,
  deleteComponent,
} from '@/services/backoffice/symbols'
import { cn } from '@/lib/utils'
import type { Component, Feature } from '@/types/backoffice'

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
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: backofficeKeys.components.all() })
    // Also refresh characters since their allograph-component-features may display differently
    queryClient.invalidateQueries({ queryKey: backofficeKeys.characters.all() })
  }

  const createMut = useMutation({
    mutationFn: (name: string) => createComponent(token!, { name }),
    onSuccess: () => {
      invalidate()
      setNewName('')
      toast.success('Component created')
    },
    onError: (err) => {
      toast.error('Failed to create component', {
        description: formatApiError(err),
      })
    },
  })

  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      updateComponent(token!, id, { name }),
    onSuccess: invalidate,
  })

  const featureLinkMut = useMutation({
    mutationFn: ({ id, features }: { id: number; features: number[] }) =>
      updateComponent(token!, id, { features }),
    onSuccess: () => {
      invalidate()
      toast.success('Component features updated')
    },
    onError: (err) => {
      toast.error('Failed to update component features', {
        description: formatApiError(err),
      })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteComponent(token!, id),
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
      toast.success('Component deleted')
    },
    onError: (err) => {
      toast.error('Failed to delete component', {
        description: formatApiError(err),
      })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    createMut.mutate(newName.trim())
  }

  const toggleFeatureLink = (comp: Component, featureId: number) => {
    const current = comp.features
    const next = current.includes(featureId)
      ? current.filter((id) => id !== featureId)
      : [...current, featureId]
    featureLinkMut.mutate({ id: comp.id, features: next })
  }

  return (
    <div className='flex h-full flex-col'>
      <form onSubmit={handleCreate} className='flex items-center gap-1 p-3 pb-2'>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder='New component name...'
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
        {components.length === 0 ? (
          <p className='text-center text-xs text-muted-foreground py-8'>
            No components yet. Create one above.
          </p>
        ) : (
          <div className='space-y-0.5'>
            {components.map((comp) => {
              const isExpanded = expandedId === comp.id
              return (
                <div key={comp.id} className='rounded border bg-card'>
                  <div className='group flex items-center gap-1 px-2 py-1'>
                    <button
                      type='button'
                      onClick={() =>
                        setExpandedId(isExpanded ? null : comp.id)
                      }
                      className='shrink-0 p-0.5 rounded hover:bg-accent'
                    >
                      <ChevronRight
                        className={cn(
                          'h-3 w-3 transition-transform',
                          isExpanded && 'rotate-90'
                        )}
                      />
                    </button>
                    <InlineEdit
                      value={comp.name}
                      onSave={(name) =>
                        renameMut.mutate({ id: comp.id, name })
                      }
                      className='flex-1 min-w-0'
                    />
                    <div className='flex items-center gap-0.5'>
                      {comp.features.length > 0 && (
                        <Badge
                          variant='secondary'
                          className='text-[10px] px-1.5 h-4 tabular-nums'
                        >
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

                  {isExpanded && (
                    <div className='border-t px-2 py-2 space-y-1'>
                      <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1'>
                        Linked Features
                      </p>
                      {allFeatures.length === 0 ? (
                        <p className='text-xs text-muted-foreground italic'>
                          No features exist yet
                        </p>
                      ) : (
                        <div className='space-y-0.5 max-h-40 overflow-y-auto'>
                          {allFeatures.map((feat) => {
                            const isLinked = comp.features.includes(feat.id)
                            return (
                              <label
                                key={feat.id}
                                className={cn(
                                  'flex items-center gap-2 rounded px-1.5 py-1 text-xs cursor-pointer transition-colors',
                                  isLinked
                                    ? 'bg-primary/5 text-foreground'
                                    : 'text-muted-foreground hover:bg-accent/50'
                                )}
                              >
                                <Checkbox
                                  checked={isLinked}
                                  onCheckedChange={() =>
                                    toggleFeatureLink(comp, feat.id)
                                  }
                                  className='h-3.5 w-3.5'
                                  disabled={featureLinkMut.isPending}
                                />
                                <span>{feat.name}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
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
        description='This will remove the component from all allographs that use it.'
        confirmLabel='Delete'
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  )
}
