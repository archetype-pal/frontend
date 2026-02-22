'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import type { AllographNested, Component, Feature } from '@/types/backoffice'

interface ComparisonMatrixProps {
  allographs: AllographNested[]
  allComponents: Component[]
  allFeatures: Feature[]
  onUpdateAllograph: (index: number, updated: AllographNested) => void
  onRemoveAllograph: (index: number) => void
  onAddAllograph: (name: string) => void
  disabled: boolean
  /** Called when a cell is clicked – navigates to the allograph's tab. */
  onSelectAllograph?: (index: number) => void
}

/**
 * Comparison matrix view for allographs within a character.
 * Shows a grid comparing which components and features each allograph has.
 */
export function ComparisonMatrix({
  allographs,
  allComponents,
  allFeatures: _allFeatures,
  disabled,
  onSelectAllograph,
}: ComparisonMatrixProps) {
  if (allographs.length === 0) {
    return (
      <div className='py-8 text-center text-sm text-muted-foreground'>
        No allographs to compare. Add allographs first.
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className='space-y-3'>
        {/* Legend */}
        <div className='flex items-center gap-4 text-[10px] text-muted-foreground px-1'>
          <span className='flex items-center gap-1.5'>
            <span className='inline-block h-3 w-3 rounded-sm bg-primary/20 border border-primary/30' />
            Has component with features
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='inline-block h-3 w-3 rounded-sm bg-amber-100 border border-amber-300 dark:bg-amber-900/30 dark:border-amber-700' />
            Has component, no features
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='inline-block h-3 w-3 rounded-sm bg-muted border border-muted-foreground/10' />
            Missing component
          </span>
        </div>

        <div className='overflow-x-auto rounded-lg border'>
          <table className='w-full text-xs'>
            <thead>
              <tr className='border-b bg-muted/50'>
                <th className='px-3 py-2 text-left font-medium text-muted-foreground sticky left-0 bg-muted/50 z-10 min-w-[120px]'>
                  Component
                </th>
                {allographs.map((allo, idx) => (
                  <th
                    key={allo.id ?? idx}
                    className='px-3 py-2 text-center font-medium min-w-[100px]'
                  >
                    {onSelectAllograph ? (
                      <button
                        type='button'
                        onClick={() => onSelectAllograph(idx)}
                        className='hover:text-primary hover:underline transition-colors'
                      >
                        {allo.name}
                      </button>
                    ) : (
                      allo.name
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allComponents.map((comp) => (
                <tr key={comp.id} className='border-b last:border-b-0 hover:bg-accent/30 transition-colors'>
                  <td className='px-3 py-2 font-medium text-muted-foreground sticky left-0 bg-card z-10'>
                    {comp.name}
                  </td>
                  {allographs.map((allo, alloIdx) => {
                    const ac = allo.components.find(
                      (c) => c.component_id === comp.id
                    )
                    const hasComponent = !!ac
                    const features = ac?.features ?? []
                    const defaultFeatures = features.filter((f) => f.set_by_default)
                    const featureCount = features.length

                    let cellClass = 'bg-muted/30'
                    if (hasComponent && featureCount > 0) {
                      cellClass = 'bg-primary/10'
                    } else if (hasComponent) {
                      cellClass = 'bg-amber-50 dark:bg-amber-900/20'
                    }

                    const cellContent = hasComponent ? (
                      <div className='flex flex-col items-center gap-0.5'>
                        {featureCount > 0 ? (
                          <span className='text-[10px] font-medium tabular-nums text-primary'>
                            {featureCount}
                          </span>
                        ) : (
                          <span className='inline-block h-2 w-2 rounded-full bg-amber-400 dark:bg-amber-600' />
                        )}
                        {defaultFeatures.length > 0 && (
                          <span className='text-[9px] text-muted-foreground'>
                            {defaultFeatures.length} default
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className='inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/20' />
                    )

                    const tooltipContent = hasComponent ? (
                      <div className='space-y-1 max-w-xs'>
                        <p className='font-medium'>
                          {allo.name} — {comp.name}
                        </p>
                        {featureCount > 0 ? (
                          <div className='flex flex-wrap gap-1'>
                            {features.map((f) => (
                              <Badge
                                key={f.id}
                                variant={f.set_by_default ? 'default' : 'outline'}
                                className='text-[10px] h-4'
                              >
                                {f.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className='text-muted-foreground'>
                            No features assigned
                          </p>
                        )}
                      </div>
                    ) : (
                      <p>
                        {allo.name} does not have {comp.name}
                      </p>
                    )

                    return (
                      <td
                        key={allo.id ?? alloIdx}
                        className={`px-3 py-2 text-center ${cellClass} transition-colors`}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type='button'
                              className='w-full flex justify-center items-center min-h-[28px] rounded hover:ring-1 hover:ring-primary/30 transition-all'
                              onClick={() => onSelectAllograph?.(alloIdx)}
                              disabled={disabled}
                            >
                              {cellContent}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side='top' className='text-xs'>
                            {tooltipContent}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary row */}
        <div className='flex items-center gap-4 text-xs text-muted-foreground px-1'>
          {allographs.map((allo, idx) => {
            const totalComponents = allo.components.length
            const totalFeatures = allo.components.reduce(
              (sum, c) => sum + c.features.length,
              0
            )
            return (
              <div key={allo.id ?? idx} className='flex items-center gap-1.5'>
                <span className='font-medium text-foreground'>{allo.name}:</span>
                <span>{totalComponents} components, {totalFeatures} features</span>
              </div>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
