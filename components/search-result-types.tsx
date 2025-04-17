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
  selectedType,
  onChange,
}: {
  selectedType: string
  onChange: (next: string) => void
}) {
  const select = (label: string) => {
    onChange(label)
  }

  return (
    <div className="flex flex-wrap gap-2 my-3">
      {resultTypeItems.map((item) => (
        <Button
        className="flex-1 min-w-[180px]"
          key={item.label}
          variant={selectedType.includes(item.label) ? 'toggle' : 'outline'}
          size="sm"
          onClick={() => select(item.label)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}
