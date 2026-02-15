'use client'

import { useState } from 'react'
import { Search, Plus, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { ComponentManager } from './component-manager'
import { FeatureManager } from './feature-manager'
import { AddCharacterDialog } from './add-character-dialog'
import type { CharacterListItem, Component, Feature } from '@/types/admin'

interface SymbolTreeSidebarProps {
  characters: CharacterListItem[]
  components: Component[]
  features: Feature[]
  selectedId: number | null
  onSelect: (id: number) => void
  onCreateCharacter: (data: { name: string; type: string | null }) => void
  creating?: boolean
}

export function SymbolTreeSidebar({
  characters,
  components,
  features,
  selectedId,
  onSelect,
  onCreateCharacter,
  creating = false,
}: SymbolTreeSidebarProps) {
  const [search, setSearch] = useState('')
  const [addCharOpen, setAddCharOpen] = useState(false)

  const filtered = search
    ? characters.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : characters

  // Group by type
  const grouped = new Map<string, CharacterListItem[]>()
  for (const char of filtered) {
    const key = char.type || 'Untyped'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(char)
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Search + Add */}
      <div className='p-3 space-y-2'>
        <div className='flex items-center gap-1'>
          <div className='relative flex-1'>
            <Search className='absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search characters...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='h-8 pl-7 text-sm'
            />
          </div>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8 shrink-0'
            onClick={() => setAddCharOpen(true)}
            title='New Character'
          >
            <Plus className='h-4 w-4' />
          </Button>
        </div>
        <p className='text-[11px] text-muted-foreground'>
          {characters.length} characters total
        </p>
      </div>

      <Separator />

      {/* Character list */}
      <ScrollArea className='flex-1'>
        <div className='p-2 space-y-1'>
          {Array.from(grouped.entries()).map(([type, chars]) => (
            <div key={type} className='space-y-0.5'>
              <p className='px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
                {type}
              </p>
              {chars.map((char) => (
                <button
                  key={char.id}
                  type='button'
                  onClick={() => onSelect(char.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    selectedId === char.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-accent'
                  )}
                >
                  <ChevronRight
                    className={cn(
                      'h-3 w-3 shrink-0 transition-transform',
                      selectedId === char.id && 'rotate-90'
                    )}
                  />
                  <span className='flex-1 text-left truncate'>{char.name}</span>
                  <Badge
                    variant='secondary'
                    className='text-[10px] px-1.5 h-4 tabular-nums'
                  >
                    {char.allograph_count}
                  </Badge>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className='px-2 py-4 text-center text-xs text-muted-foreground'>
              {search ? 'No matching characters' : 'No characters yet'}
            </p>
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Component & Feature pools */}
      <div className='p-3 space-y-4 max-h-[40%] overflow-y-auto'>
        <ComponentManager components={components} allFeatures={features} />
        <FeatureManager features={features} />
      </div>

      <AddCharacterDialog
        open={addCharOpen}
        onOpenChange={setAddCharOpen}
        onSubmit={(data) => {
          onCreateCharacter(data)
          setAddCharOpen(false)
        }}
        loading={creating}
      />
    </div>
  )
}
