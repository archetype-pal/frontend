'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { Save, Plus, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AllographCard } from './allograph-card'
import { AddAllographDialog } from './add-allograph-dialog'
import { ConfirmDialog } from '@/components/admin/common/confirm-dialog'
import {
  getCharacter,
  updateCharacterStructure,
  deleteCharacter,
} from '@/services/admin/symbols'
import { adminKeys } from '@/lib/admin/query-keys'
import { formatApiError } from '@/lib/admin/format-api-error'
import { useUnsavedGuard } from '@/hooks/admin/use-unsaved-guard'
import { useKeyboardShortcut } from '@/hooks/admin/use-keyboard-shortcut'
import type {
  CharacterDetail as CharacterDetailType,
  CharacterStructurePayload,
  AllographNested,
  Component,
  Feature,
} from '@/types/admin'

const CHARACTER_TYPES = ['', 'Letter', 'Punctuation', 'Numeral', 'Symbol', 'Abbreviation']

interface CharacterDetailProps {
  characterId: number
  allComponents: Component[]
  allFeatures: Feature[]
  onDeleted: () => void
}

export function CharacterDetail({
  characterId,
  allComponents,
  allFeatures,
  onDeleted,
}: CharacterDetailProps) {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const { data: character, isLoading } = useQuery({
    queryKey: adminKeys.characters.detail(characterId),
    queryFn: () => getCharacter(token!, characterId),
    enabled: !!token,
  })

  // Local draft state for editing
  const [draft, setDraft] = useState<CharacterDetailType | null>(null)
  const [dirty, setDirty] = useState(false)
  const [addAlloOpen, setAddAlloOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Warn before leaving with unsaved changes
  useUnsavedGuard(dirty)

  // Sync draft with fetched data
  useEffect(() => {
    if (character) {
      setDraft(character)
      setDirty(false)
    }
  }, [character])

  const updateDraft = useCallback(
    (updater: (prev: CharacterDetailType) => CharacterDetailType) => {
      setDraft((prev) => {
        if (!prev) return prev
        const next = updater(prev)
        setDirty(true)
        return next
      })
    },
    []
  )

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (payload: CharacterStructurePayload) =>
      updateCharacterStructure(token!, characterId, payload),
    onSuccess: (data) => {
      toast.success('Character saved')
      queryClient.setQueryData(adminKeys.characters.detail(characterId), data)
      queryClient.invalidateQueries({ queryKey: adminKeys.characters.all() })
      setDirty(false)
    },
    onError: (err) => {
      toast.error('Failed to save character', {
        description: formatApiError(err),
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteCharacter(token!, characterId),
    onSuccess: () => {
      toast.success('Character deleted')
      queryClient.invalidateQueries({ queryKey: adminKeys.characters.all() })
      onDeleted()
    },
    onError: (err) => {
      toast.error('Failed to delete character', {
        description: formatApiError(err),
      })
    },
  })

  const handleSave = () => {
    if (!draft) return
    const payload: CharacterStructurePayload = {
      name: draft.name,
      type: draft.type,
      allographs: draft.allographs.map((allo) => ({
        ...(allo.id ? { id: allo.id } : {}),
        name: allo.name,
        components: allo.components.map((ac) => ({
          ...(ac.id ? { id: ac.id } : {}),
          component_id: ac.component_id,
          features: ac.features.map((f) => ({
            id: f.id,
            set_by_default: f.set_by_default,
          })),
        })),
      })),
    }
    saveMutation.mutate(payload)
  }

  // Cmd+S to save
  useKeyboardShortcut('mod+s', () => {
    if (dirty && !saveMutation.isPending) handleSave()
  }, dirty)

  const handleAddAllograph = (name: string) => {
    updateDraft((prev) => ({
      ...prev,
      allographs: [
        ...prev.allographs,
        { id: 0, name, components: [] } as AllographNested,
      ],
    }))
    setAddAlloOpen(false)
  }

  const handleUpdateAllograph = (index: number, updated: AllographNested) => {
    updateDraft((prev) => ({
      ...prev,
      allographs: prev.allographs.map((a, i) => (i === index ? updated : a)),
    }))
  }

  const handleRemoveAllograph = (index: number) => {
    updateDraft((prev) => ({
      ...prev,
      allographs: prev.allographs.filter((_, i) => i !== index),
    }))
  }

  if (isLoading || !draft) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-start justify-between'>
        <div className='space-y-1'>
          <h2 className='text-xl font-semibold'>Character: {draft.name}</h2>
          <div className='flex items-center gap-2'>
            {draft.type && <Badge variant='secondary'>{draft.type}</Badge>}
            <span className='text-sm text-muted-foreground'>
              {draft.allographs.length} allograph{draft.allographs.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='text-destructive hover:text-destructive'
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className='h-3.5 w-3.5 mr-1' />
            Delete
          </Button>
          <Button
            size='sm'
            onClick={handleSave}
            disabled={!dirty || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className='h-3.5 w-3.5 mr-1 animate-spin' />
            ) : (
              <Save className='h-3.5 w-3.5 mr-1' />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Basic fields */}
      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-1.5'>
          <Label>Name</Label>
          <Input
            value={draft.name}
            onChange={(e) =>
              updateDraft((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </div>
        <div className='space-y-1.5'>
          <Label>Type</Label>
          <Select
            value={draft.type || '__none'}
            onValueChange={(val) =>
              updateDraft((prev) => ({
                ...prev,
                type: val === '__none' ? null : val,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHARACTER_TYPES.map((t) => (
                <SelectItem key={t || '__none'} value={t || '__none'}>
                  {t || 'None'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Allographs */}
      <div>
        <div className='flex items-center justify-between mb-3'>
          <h3 className='text-sm font-medium'>Allographs</h3>
          <Button
            variant='outline'
            size='sm'
            className='h-7 gap-1 text-xs'
            onClick={() => setAddAlloOpen(true)}
          >
            <Plus className='h-3 w-3' />
            Add Allograph
          </Button>
        </div>

        {draft.allographs.length === 0 ? (
          <div className='rounded-lg border border-dashed p-8 text-center text-muted-foreground'>
            <p className='text-sm'>No allographs yet.</p>
            <Button
              variant='link'
              size='sm'
              className='mt-1'
              onClick={() => setAddAlloOpen(true)}
            >
              Add the first allograph
            </Button>
          </div>
        ) : (
          <div className='space-y-3'>
            {draft.allographs.map((allo, idx) => (
              <AllographCard
                key={allo.id || `new-${idx}`}
                allograph={allo}
                allComponents={allComponents}
                allFeatures={allFeatures}
                onUpdate={(updated) => handleUpdateAllograph(idx, updated)}
                onRemove={() => handleRemoveAllograph(idx)}
                disabled={saveMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dirty indicator */}
      {dirty && (
        <div className='sticky bottom-0 bg-background/95 backdrop-blur border-t -mx-6 px-6 py-3 flex items-center justify-between'>
          <span className='text-sm text-amber-600 font-medium'>
            Unsaved changes
          </span>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                if (character) {
                  setDraft(character)
                  setDirty(false)
                }
              }}
            >
              Discard
            </Button>
            <Button
              size='sm'
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AddAllographDialog
        open={addAlloOpen}
        onOpenChange={setAddAlloOpen}
        characterName={draft.name}
        onSubmit={handleAddAllograph}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${draft.name}"?`}
        description='This will permanently delete this character and all its allographs, components, and features. This cannot be undone.'
        confirmLabel='Delete'
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  )
}
