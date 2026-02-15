'use client'

import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Component } from '@/types/backoffice'

interface AddComponentPopoverProps {
  /** All available components. */
  components: Component[]
  /** IDs of components already attached to this allograph. */
  existingComponentIds: number[]
  onAdd: (componentId: number) => void
  disabled?: boolean
}

export function AddComponentPopover({
  components,
  existingComponentIds,
  onAdd,
  disabled = false,
}: AddComponentPopoverProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightIdx, setHighlightIdx] = useState(0)

  const available = components.filter(
    (c) =>
      !existingComponentIds.includes(c.id) &&
      c.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (id: number) => {
    onAdd(id)
    setOpen(false)
    setSearch('')
    setHighlightIdx(0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((prev) => (prev < available.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((prev) => (prev > 0 ? prev - 1 : available.length - 1))
    } else if (e.key === 'Enter' && available.length > 0) {
      e.preventDefault()
      handleSelect(available[highlightIdx].id)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='sm'
          className='h-7 gap-1 text-xs text-muted-foreground'
          disabled={disabled}
        >
          <Plus className='h-3 w-3' />
          Add Component
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-56 p-2' align='start'>
        <div className='relative mb-2'>
          <Search className='absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search components...'
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setHighlightIdx(0)
            }}
            onKeyDown={handleKeyDown}
            className='h-8 pl-7 text-sm'
            autoFocus
          />
        </div>
        <div className='max-h-40 overflow-y-auto'>
          {available.length === 0 ? (
            <p className='px-2 py-3 text-center text-xs text-muted-foreground'>
              {search ? 'No matching components' : 'All components added'}
            </p>
          ) : (
            available.map((comp, idx) => (
              <button
                key={comp.id}
                type='button'
                onClick={() => handleSelect(comp.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                  'transition-colors',
                  idx === highlightIdx
                    ? 'bg-accent'
                    : 'hover:bg-accent'
                )}
              >
                {comp.name}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
