'use client'

import { useState } from 'react'
import { ChevronDown, Trash2, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { AllographComponentRow } from './allograph-component-row'
import { AddComponentPopover } from './add-component-popover'
import type {
  AllographNested,
  AllographComponentNested,
  Component,
  Feature,
} from '@/types/admin'

interface AllographCardProps {
  allograph: AllographNested
  allComponents: Component[]
  allFeatures: Feature[]
  onUpdate: (updated: AllographNested) => void
  onRemove: () => void
  disabled?: boolean
}

export function AllographCard({
  allograph,
  allComponents,
  allFeatures,
  onUpdate,
  onRemove,
  disabled = false,
}: AllographCardProps) {
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(allograph.name)

  const existingComponentIds = allograph.components.map((c) => c.component_id)

  const saveName = () => {
    const trimmed = draftName.trim()
    if (trimmed && trimmed !== allograph.name) {
      onUpdate({ ...allograph, name: trimmed })
    }
    setEditingName(false)
  }

  const handleAddComponent = (componentId: number) => {
    const comp = allComponents.find((c) => c.id === componentId)
    if (!comp) return
    const newAc: AllographComponentNested = {
      id: 0, // will be assigned by backend
      component_id: comp.id,
      component_name: comp.name,
      features: [],
    }
    onUpdate({
      ...allograph,
      components: [...allograph.components, newAc],
    })
  }

  const handleRemoveComponent = (index: number) => {
    onUpdate({
      ...allograph,
      components: allograph.components.filter((_, i) => i !== index),
    })
  }

  const handleToggleFeature = (compIndex: number, featureId: number, checked: boolean) => {
    const updated = allograph.components.map((ac, i) => {
      if (i !== compIndex) return ac
      if (checked) {
        const feat = allFeatures.find((f) => f.id === featureId)
        return {
          ...ac,
          features: [
            ...ac.features,
            { id: featureId, name: feat?.name ?? '', set_by_default: false },
          ],
        }
      }
      return {
        ...ac,
        features: ac.features.filter((f) => f.id !== featureId),
      }
    })
    onUpdate({ ...allograph, components: updated })
  }

  const handleToggleDefault = (compIndex: number, featureId: number, setByDefault: boolean) => {
    const updated = allograph.components.map((ac, i) => {
      if (i !== compIndex) return ac
      return {
        ...ac,
        features: ac.features.map((f) =>
          f.id === featureId ? { ...f, set_by_default: setByDefault } : f
        ),
      }
    })
    onUpdate({ ...allograph, components: updated })
  }

  return (
    <Collapsible defaultOpen className='rounded-lg border'>
      <div className='flex items-center gap-2 px-3 py-2'>
        <CollapsibleTrigger asChild>
          <Button variant='ghost' size='icon' className='h-6 w-6 shrink-0'>
            <ChevronDown className='h-4 w-4 transition-transform [[data-state=closed]>&]:rotate-[-90deg]' />
          </Button>
        </CollapsibleTrigger>

        {editingName ? (
          <div className='flex items-center gap-1 flex-1'>
            <Input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className='h-7 text-sm'
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') {
                  setDraftName(allograph.name)
                  setEditingName(false)
                }
              }}
            />
            <Button variant='ghost' size='icon' className='h-6 w-6' onClick={saveName}>
              <Check className='h-3.5 w-3.5' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6'
              onClick={() => {
                setDraftName(allograph.name)
                setEditingName(false)
              }}
            >
              <X className='h-3.5 w-3.5' />
            </Button>
          </div>
        ) : (
          <button
            type='button'
            className='flex-1 text-left text-sm font-medium group flex items-center gap-1'
            onClick={() => setEditingName(true)}
          >
            {allograph.name}
            <Pencil className='h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity' />
          </button>
        )}

        <span className='text-xs text-muted-foreground'>
          {allograph.components.length} comp.
        </span>
        <Button
          variant='ghost'
          size='icon'
          className='h-6 w-6 text-muted-foreground hover:text-destructive'
          onClick={onRemove}
          disabled={disabled}
          title='Delete allograph'
        >
          <Trash2 className='h-3.5 w-3.5' />
        </Button>
      </div>

      <CollapsibleContent>
        <div className='border-t px-3 py-2 space-y-2'>
          {allograph.components.map((ac, idx) => {
            const globalComp = allComponents.find((c) => c.id === ac.component_id)
            return (
              <AllographComponentRow
                key={ac.id || `new-${idx}`}
                allographComponentId={ac.id || undefined}
                componentId={ac.component_id}
                componentName={ac.component_name}
                features={ac.features}
                globalComponent={globalComp}
                allFeatures={allFeatures}
                onRemove={() => handleRemoveComponent(idx)}
                onToggleFeature={(fId, checked) =>
                  handleToggleFeature(idx, fId, checked)
                }
                onToggleDefault={(fId, def) =>
                  handleToggleDefault(idx, fId, def)
                }
                disabled={disabled}
              />
            )
          })}

          <AddComponentPopover
            components={allComponents}
            existingComponentIds={existingComponentIds}
            onAdd={handleAddComponent}
            disabled={disabled}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
