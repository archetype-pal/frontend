'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeatureCheckbox } from './feature-checkbox'
import type { Component, Feature } from '@/types/backoffice'

interface ComponentFeatureState {
  id: number // feature id
  name: string
  set_by_default: boolean
}

interface AllographComponentRowProps {
  componentName: string
  features: ComponentFeatureState[]
  /** All features available for this component (from global component pool). */
  globalComponent: Component | undefined
  allFeatures: Feature[]
  onRemove: () => void
  onToggleFeature: (featureId: number, checked: boolean) => void
  onToggleDefault: (featureId: number, setByDefault: boolean) => void
  disabled?: boolean
}

export function AllographComponentRow({
  componentName,
  features,
  globalComponent,
  allFeatures,
  onRemove,
  onToggleFeature,
  onToggleDefault,
  disabled = false,
}: AllographComponentRowProps) {
  // Get available features: those linked to this component in the global pool
  const availableFeatureIds = globalComponent?.features ?? []
  const availableFeatures = allFeatures.filter((f) =>
    availableFeatureIds.includes(f.id)
  )

  // Build a map of current feature state
  const featureMap = new Map(features.map((f) => [f.id, f]))

  return (
    <div className='rounded-lg border bg-card'>
      <div className='flex items-center justify-between px-3 py-2'>
        <span className='text-sm font-medium'>{componentName}</span>
        <Button
          variant='ghost'
          size='icon'
          className='h-6 w-6 text-muted-foreground hover:text-destructive'
          onClick={onRemove}
          disabled={disabled}
          title='Remove component'
        >
          <X className='h-3.5 w-3.5' />
        </Button>
      </div>
      <div className='px-3 pb-2'>
        {availableFeatures.length === 0 ? (
          <p className='text-xs text-muted-foreground italic'>
            No features linked to this component
          </p>
        ) : (
          <div className='flex flex-wrap gap-1.5'>
            {availableFeatures.map((feat) => {
              const state = featureMap.get(feat.id)
              return (
                <FeatureCheckbox
                  key={feat.id}
                  featureId={feat.id}
                  name={feat.name}
                  checked={!!state}
                  setByDefault={state?.set_by_default ?? false}
                  onToggle={onToggleFeature}
                  onToggleDefault={onToggleDefault}
                  disabled={disabled}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
