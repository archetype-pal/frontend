'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { AddComponentPopover } from './add-component-popover'
import type {
  AllographNested,
  AllographComponentNested,
  AllographComponentFeatureNested,
  Component,
  Feature,
} from '@/types/admin'

interface ComparisonMatrixProps {
  allographs: AllographNested[]
  allComponents: Component[]
  allFeatures: Feature[]
  onUpdateAllograph: (index: number, updated: AllographNested) => void
  onRemoveAllograph: (index: number) => void
  onAddAllograph: (name: string) => void
  disabled?: boolean
}

export function ComparisonMatrix({
  allographs,
  allComponents,
  allFeatures,
  onUpdateAllograph,
  onRemoveAllograph,
  onAddAllograph,
  disabled = false,
}: ComparisonMatrixProps) {
  const [addingAllo, setAddingAllo] = useState(false)
  const [newAlloName, setNewAlloName] = useState('')

  // Collect all unique component IDs used across allographs
  const usedComponentIds = new Set<number>()
  for (const allo of allographs) {
    for (const ac of allo.components) {
      usedComponentIds.add(ac.component_id)
    }
  }
  const usedComponents = Array.from(usedComponentIds).map((id) => {
    const comp = allComponents.find((c) => c.id === id)
    return { id, name: comp?.name ?? `Component ${id}`, features: comp?.features ?? [] }
  })

  // Get the features for a specific allograph-component pair
  const getAcFeatures = (alloIdx: number, componentId: number) => {
    const ac = allographs[alloIdx].components.find(
      (c) => c.component_id === componentId
    )
    return ac?.features ?? []
  }

  // Check if an allograph has a given component
  const hasComponent = (alloIdx: number, componentId: number) => {
    return allographs[alloIdx].components.some(
      (c) => c.component_id === componentId
    )
  }

  // Toggle a feature on a specific allograph-component
  const toggleFeature = (
    alloIdx: number,
    componentId: number,
    featureId: number
  ) => {
    const allo = allographs[alloIdx]
    const acIdx = allo.components.findIndex(
      (c) => c.component_id === componentId
    )

    if (acIdx === -1) {
      // Component not on this allograph -- add it with just this feature
      const comp = allComponents.find((c) => c.id === componentId)
      const feat = allFeatures.find((f) => f.id === featureId)
      const newAc: AllographComponentNested = {
        id: 0,
        component_id: componentId,
        component_name: comp?.name ?? '',
        features: [
          { id: featureId, name: feat?.name ?? '', set_by_default: false },
        ],
      }
      onUpdateAllograph(alloIdx, {
        ...allo,
        components: [...allo.components, newAc],
      })
      return
    }

    const ac = allo.components[acIdx]
    const existingFeat = ac.features.find((f) => f.id === featureId)

    const updatedAc = {
      ...ac,
      features: existingFeat
        ? ac.features.filter((f) => f.id !== featureId)
        : [
            ...ac.features,
            {
              id: featureId,
              name: allFeatures.find((f) => f.id === featureId)?.name ?? '',
              set_by_default: false,
            } as AllographComponentFeatureNested,
          ],
    }

    onUpdateAllograph(alloIdx, {
      ...allo,
      components: allo.components.map((c, i) => (i === acIdx ? updatedAc : c)),
    })
  }

  // Toggle default on a feature
  const toggleDefault = (
    alloIdx: number,
    componentId: number,
    featureId: number
  ) => {
    const allo = allographs[alloIdx]
    const acIdx = allo.components.findIndex(
      (c) => c.component_id === componentId
    )
    if (acIdx === -1) return

    const ac = allo.components[acIdx]
    const updatedAc = {
      ...ac,
      features: ac.features.map((f) =>
        f.id === featureId ? { ...f, set_by_default: !f.set_by_default } : f
      ),
    }

    onUpdateAllograph(alloIdx, {
      ...allo,
      components: allo.components.map((c, i) => (i === acIdx ? updatedAc : c)),
    })
  }

  // Add a component to all allographs that don't have it
  const handleAddComponentToMatrix = (componentId: number) => {
    const comp = allComponents.find((c) => c.id === componentId)
    if (!comp) return

    // Auto-fill features from template
    const autoFeatures: AllographComponentFeatureNested[] = comp.features
      .map((fId) => {
        const feat = allFeatures.find((f) => f.id === fId)
        if (!feat) return null
        return { id: fId, name: feat.name, set_by_default: false }
      })
      .filter(Boolean) as AllographComponentFeatureNested[]

    for (let i = 0; i < allographs.length; i++) {
      if (!hasComponent(i, componentId)) {
        const newAc: AllographComponentNested = {
          id: 0,
          component_id: comp.id,
          component_name: comp.name,
          features: autoFeatures,
        }
        onUpdateAllograph(i, {
          ...allographs[i],
          components: [...allographs[i].components, newAc],
        })
      }
    }
  }

  const allExistingComponentIds = Array.from(usedComponentIds)

  return (
    <div className='rounded-lg border overflow-hidden'>
      <div className='overflow-x-auto'>
        <div className='min-w-max'>
          <table className='w-full text-xs'>
            <thead>
              <tr className='border-b bg-muted/50'>
                <th className='text-left px-3 py-2 font-medium text-muted-foreground sticky left-0 bg-muted/50 min-w-[140px]'>
                  Component / Feature
                </th>
                {allographs.map((allo, alloIdx) => (
                  <th
                    key={allo.id || `new-${alloIdx}`}
                    className='text-center px-3 py-2 font-medium min-w-[120px]'
                  >
                    <div className='flex items-center justify-center gap-1'>
                      <span>{allo.name}</span>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-4 w-4 text-muted-foreground hover:text-destructive'
                        onClick={() => onRemoveAllograph(alloIdx)}
                        disabled={disabled}
                      >
                        <X className='h-3 w-3' />
                      </Button>
                    </div>
                  </th>
                ))}
                <th className='px-3 py-2 min-w-[100px]'>
                  {addingAllo ? (
                    <Input
                      value={newAlloName}
                      onChange={(e) => setNewAlloName(e.target.value)}
                      placeholder='Name...'
                      className='h-6 text-xs w-24'
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newAlloName.trim()) {
                          onAddAllograph(newAlloName.trim())
                          setNewAlloName('')
                          setAddingAllo(false)
                        }
                        if (e.key === 'Escape') {
                          setAddingAllo(false)
                          setNewAlloName('')
                        }
                      }}
                      onBlur={() => {
                        if (!newAlloName.trim()) {
                          setAddingAllo(false)
                          setNewAlloName('')
                        }
                      }}
                    />
                  ) : (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 text-xs text-muted-foreground'
                      onClick={() => setAddingAllo(true)}
                      disabled={disabled}
                    >
                      <Plus className='h-3 w-3 mr-1' />
                      Add
                    </Button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {usedComponents.map((comp) => {
                const compFeatureIds = comp.features
                const compFeatures = allFeatures.filter((f) =>
                  compFeatureIds.includes(f.id)
                )
                return (
                  <CompMatrixComponentGroup
                    key={comp.id}
                    componentId={comp.id}
                    componentName={comp.name}
                    features={compFeatures}
                    allographs={allographs}
                    getAcFeatures={getAcFeatures}
                    toggleFeature={toggleFeature}
                    toggleDefault={toggleDefault}
                    disabled={disabled}
                  />
                )
              })}
            </tbody>
          </table>

          {/* Add component row */}
          <div className='border-t px-3 py-2'>
            <AddComponentPopover
              components={allComponents}
              existingComponentIds={allExistingComponentIds}
              onAdd={handleAddComponentToMatrix}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-component for a component group in the matrix ──────────────────

function CompMatrixComponentGroup({
  componentId,
  componentName,
  features,
  allographs,
  getAcFeatures,
  toggleFeature,
  toggleDefault,
  disabled,
}: {
  componentId: number
  componentName: string
  features: Feature[]
  allographs: AllographNested[]
  getAcFeatures: (alloIdx: number, componentId: number) => AllographComponentFeatureNested[]
  toggleFeature: (alloIdx: number, componentId: number, featureId: number) => void
  toggleDefault: (alloIdx: number, componentId: number, featureId: number) => void
  disabled: boolean
}) {
  return (
    <>
      {/* Component header row */}
      <tr className='border-b bg-muted/30'>
        <td className='px-3 py-1.5 font-semibold text-foreground sticky left-0 bg-muted/30'>
          {componentName}
        </td>
        {allographs.map((_, alloIdx) => (
          <td key={alloIdx} className='px-3 py-1.5 text-center text-muted-foreground'>
            {getAcFeatures(alloIdx, componentId).length > 0
              ? `${getAcFeatures(alloIdx, componentId).length}f`
              : '\u2014'}
          </td>
        ))}
        <td />
      </tr>
      {/* Feature rows */}
      {features.map((feat) => (
        <tr key={feat.id} className='border-b last:border-b-0 hover:bg-accent/30'>
          <td className='pl-6 pr-3 py-1 text-muted-foreground sticky left-0 bg-background'>
            {feat.name}
          </td>
          {allographs.map((_, alloIdx) => {
            const acFeatures = getAcFeatures(alloIdx, componentId)
            const acFeat = acFeatures.find((f) => f.id === feat.id)
            const isChecked = !!acFeat
            const isDefault = acFeat?.set_by_default ?? false
            return (
              <td key={alloIdx} className='px-3 py-1 text-center'>
                <div className='flex items-center justify-center gap-1'>
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() =>
                      toggleFeature(alloIdx, componentId, feat.id)
                    }
                    disabled={disabled}
                    className='h-3.5 w-3.5'
                  />
                  {isChecked && (
                    <button
                      type='button'
                      onClick={() =>
                        toggleDefault(alloIdx, componentId, feat.id)
                      }
                      disabled={disabled}
                      className={cn(
                        'text-[9px] font-medium rounded px-1 py-0.5 transition-colors',
                        isDefault
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                      title={
                        isDefault
                          ? 'Default (click to make optional)'
                          : 'Optional (click to set as default)'
                      }
                    >
                      {isDefault ? 'd' : 'o'}
                    </button>
                  )}
                </div>
              </td>
            )
          })}
          <td />
        </tr>
      ))}
    </>
  )
}
