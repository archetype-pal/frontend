'use client'

import type { AllographNested, Component, Feature } from '@/types/backoffice'

interface ComparisonMatrixProps {
  allographs: AllographNested[]
  allComponents: Component[]
  allFeatures: Feature[]
  onUpdateAllograph: (index: number, updated: AllographNested) => void
  onRemoveAllograph: (index: number) => void
  onAddAllograph: (name: string) => void
  disabled: boolean
}

/**
 * Comparison matrix view for allographs within a character.
 * Shows a grid comparing which components/features each allograph has.
 * TODO: Implement full matrix UI.
 */
export function ComparisonMatrix({
  allographs,
  allComponents,
  allFeatures,
  disabled,
}: ComparisonMatrixProps) {
  if (allographs.length === 0) {
    return (
      <div className='py-8 text-center text-sm text-muted-foreground'>
        No allographs to compare. Add allographs first.
      </div>
    )
  }

  return (
    <div className='overflow-x-auto rounded-lg border'>
      <table className='w-full text-xs'>
        <thead>
          <tr className='border-b bg-muted/50'>
            <th className='px-3 py-2 text-left font-medium text-muted-foreground'>
              Component / Feature
            </th>
            {allographs.map((allo) => (
              <th
                key={allo.id}
                className='px-3 py-2 text-center font-medium min-w-[80px]'
              >
                {allo.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allComponents.map((comp) => (
            <tr key={comp.id} className='border-b last:border-b-0'>
              <td className='px-3 py-1.5 font-medium text-muted-foreground'>
                {comp.name}
              </td>
              {allographs.map((allo) => {
                const hasComponent = allo.components.some(
                  (ac) => ac.component_id === comp.id
                )
                return (
                  <td
                    key={allo.id}
                    className='px-3 py-1.5 text-center'
                  >
                    {hasComponent ? (
                      <span className='inline-block h-2 w-2 rounded-full bg-primary' />
                    ) : (
                      <span className='inline-block h-2 w-2 rounded-full bg-muted' />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
