'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'

const resultTypeItems = [
  { label: 'Manuscripts', value: 'manuscripts', count: 712 },
  { label: 'Texts', value: 'texts', count: 156 },
  { label: 'Graphs', value: 'graphs', count: 89 },
  { label: 'Clauses', value: 'clauses', count: 45 },
  { label: 'Places', value: 'places', count: 34 },
  { label: 'People', value: 'people', count: 23 },
]

export function ResultTypeToggle({
  selectedType,
  onChange,
}: {
  selectedType: string
  onChange: (next: string) => void
}) {
  const select = (value: string) => {
    onChange(value)
  }

  return (
    <div className="flex flex-wrap gap-2 my-3">
      {resultTypeItems.map((item) => (
        <Button
          className="flex-1 min-w-[180px]"
          key={item.value}
          variant={selectedType == item.value ? 'toggle' : 'outline'}
          size="sm"
          onClick={() => select(item.value)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}
