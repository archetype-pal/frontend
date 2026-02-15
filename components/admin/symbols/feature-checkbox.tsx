'use client'

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

/**
 * Compact pill-style feature toggle.
 * Click to toggle checked/unchecked.
 * When checked, shows a (d)/(o) badge -- click that to toggle default.
 */
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
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors cursor-pointer select-none border',
        checked
          ? 'bg-primary/10 border-primary/30 text-foreground'
          : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      <button
        type='button'
        onClick={() => onToggle(featureId, !checked)}
        disabled={disabled}
        className='flex items-center gap-1'
      >
        <span
          className={cn(
            'h-2.5 w-2.5 rounded-sm border flex items-center justify-center transition-colors',
            checked
              ? 'bg-primary border-primary'
              : 'border-muted-foreground/40'
          )}
        >
          {checked && (
            <svg
              className='h-2 w-2 text-primary-foreground'
              viewBox='0 0 12 12'
              fill='none'
            >
              <path
                d='M2.5 6L5 8.5L9.5 3.5'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          )}
        </span>
        <span className={cn(!checked && 'line-through')}>{name}</span>
      </button>
      {checked && (
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation()
            onToggleDefault(featureId, !setByDefault)
          }}
          disabled={disabled}
          className={cn(
            'text-[9px] font-bold rounded px-1 py-px transition-colors leading-none',
            setByDefault
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
          title={
            setByDefault
              ? 'Default (click to make optional)'
              : 'Optional (click to set as default)'
          }
        >
          {setByDefault ? 'd' : 'o'}
        </button>
      )}
    </span>
  )
}
