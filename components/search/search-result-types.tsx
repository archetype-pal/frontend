'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'

const resultTypeItems = [
  { label: 'Manuscripts', value: 'manuscripts' },
  { label: 'Images', value: 'images' },
  { label: 'Scribes', value: 'scribes' },
  { label: 'Hands', value: 'hands' },
  { label: 'Graphs', value: 'graphs' },
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
