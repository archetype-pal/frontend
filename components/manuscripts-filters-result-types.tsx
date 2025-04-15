'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'

const resultTypeItems = [
  { label: 'Manuscripts', count: 712 },
  { label: 'Texts', count: 156 },
  { label: 'Graphs', count: 89 },
  { label: 'Classes', count: 45 },
  { label: 'Places', count: 34 },
  { label: 'People', count: 23 },
]

export function ResultTypeToggle({
  selectedTypes,
  onChange,
}: {
  selectedTypes: string[]
  onChange: (next: string[]) => void
}) {
  const toggle = (label: string) => {
    onChange(
      selectedTypes.includes(label)
        ? selectedTypes.filter((t) => t !== label)
        : [...selectedTypes, label]
    )
  }

  return (
    <div className="flex flex-wrap gap-2 my-3">
      {resultTypeItems.map((item) => (
        <Button
        className="flex-1 min-w-[180px]"
          key={item.label}
          variant={selectedTypes.includes(item.label) ? 'toggle' : 'outline'}
          size="sm"
          onClick={() => toggle(item.label)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}
