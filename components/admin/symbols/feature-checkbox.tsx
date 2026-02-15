'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface FeatureCheckboxProps {
  featureId: number
  name: string
  checked: boolean
  setByDefault: boolean
  onToggle: (featureId: number, checked: boolean) => void
  onToggleDefault: (featureId: number, setByDefault: boolean) => void
  disabled?: boolean
}

export function FeatureCheckbox({
  featureId,
  name,
  checked,
  setByDefault,
  onToggle,
  onToggleDefault,
  disabled = false,
}: FeatureCheckboxProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded px-2 py-1 text-sm transition-colors',
        checked ? 'bg-accent/50' : 'opacity-60'
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(val) => onToggle(featureId, !!val)}
        disabled={disabled}
        className='h-3.5 w-3.5'
      />
      <span className={cn('flex-1', !checked && 'line-through text-muted-foreground')}>
        {name}
      </span>
      {checked && (
        <button
          type='button'
          onClick={() => onToggleDefault(featureId, !setByDefault)}
          disabled={disabled}
          className={cn(
            'text-[10px] font-medium rounded px-1.5 py-0.5 transition-colors',
            setByDefault
              ? 'bg-primary/15 text-primary'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
          title={setByDefault ? 'Set by default (click to unset)' : 'Click to set as default'}
        >
          {setByDefault ? 'default' : 'optional'}
        </button>
      )}
    </div>
  )
}
