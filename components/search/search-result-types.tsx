'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'

export const resultTypeItems = [
  { label: 'Manuscripts', value: 'manuscripts' },
  { label: 'Images',      value: 'images' },
  { label: 'Scribes',     value: 'scribes' },
  { label: 'Hands',       value: 'hands' },
  { label: 'Graphs',      value: 'graphs' },
] as const

export type ResultType = typeof resultTypeItems[number]['value']

export function ResultTypeToggle({
  selectedType,
  onChange,
}: {
  selectedType: ResultType
  onChange: (next: ResultType) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 my-3">
      {resultTypeItems.map((item) => (
        <Button
          key={item.value}
          className="flex-1 min-w-[180px]"
          variant={selectedType === item.value ? 'toggle' : 'outline'}
          size="sm"
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}
