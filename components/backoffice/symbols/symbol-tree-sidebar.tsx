'use client'

import { useState, useCallback, useMemo } from 'react'
import { Search, ChevronRight, Layers, Tag, MapPin, Type } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ComponentManager } from './component-manager'
import { FeatureManager } from './feature-manager'
import { PositionManager } from './position-manager'
import {
  CHARACTER_TYPES,
  type CharacterListItem,
  type Component,
  type Feature,
  type Position,
} from '@/types/backoffice'

interface SymbolTreeSidebarProps {
  characters: CharacterListItem[]
  components: Component[]
  features: Feature[]
  positions: Position[]
  selectedId: number | null
  onSelect: (id: number) => void
  onCreateCharacter: (data: { name: string; type: string | null }) => void
  creating?: boolean
  /** Controlled active tab (optional). When provided, the parent controls which tab is shown. */
  activeTab?: string
  /** Called when the user switches tabs. Used together with activeTab for controlled mode. */
  onTabChange?: (tab: string) => void
}

export function SymbolTreeSidebar({
  characters,
  components,
  features,
  positions,
  selectedId,
  onSelect,
  onCreateCharacter,
  creating = false,
  activeTab: controlledTab,
  onTabChange,
}: SymbolTreeSidebarProps) {
  const [internalTab, setInternalTab] = useState('characters')
  const tab = controlledTab ?? internalTab
  const setTab = onTabChange ?? setInternalTab
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('__all')
  const [newCharName, setNewCharName] = useState('')

  // Filter characters
  const filtered = characters.filter((c) => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const matchesType =
      typeFilter === '__all' ||
      (typeFilter === '__untyped' ? !c.type : c.type === typeFilter)
    return matchesSearch && matchesType
  })

  // Group by type
  const grouped = new Map<string, CharacterListItem[]>()
  for (const char of filtered) {
    const key = char.type || 'Untyped'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(char)
  }

  // Flat list of filtered character IDs for keyboard navigation
  const flatIds = useMemo(() => filtered.map((c) => c.id), [filtered])

  const handleInlineCreate = () => {
    const trimmed = newCharName.trim()
    if (!trimmed) return
    onCreateCharacter({ name: trimmed, type: null })
    setNewCharName('')
  }

  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (flatIds.length === 0) return
      const currentIdx = selectedId ? flatIds.indexOf(selectedId) : -1

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIdx = currentIdx < flatIds.length - 1 ? currentIdx + 1 : 0
        onSelect(flatIds[nextIdx])
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : flatIds.length - 1
        onSelect(flatIds[prevIdx])
      }
    },
    [flatIds, selectedId, onSelect]
  )

  return (
    <Tabs value={tab} onValueChange={setTab} className='flex h-full flex-col'>
      <TabsList className='mx-2 mt-2 grid w-auto grid-cols-4 bg-muted/50'>
        <TabsTrigger value='characters' className='text-xs px-1 gap-1' title='Characters'>
          <Type className='h-3.5 w-3.5' />
          <span className='hidden xl:inline'>Chars</span>
        </TabsTrigger>
        <TabsTrigger value='components' className='text-xs px-1 gap-1' title='Components'>
          <Layers className='h-3.5 w-3.5' />
          <span className='hidden xl:inline'>Comps</span>
        </TabsTrigger>
        <TabsTrigger value='features' className='text-xs px-1 gap-1' title='Features'>
          <Tag className='h-3.5 w-3.5' />
          <span className='hidden xl:inline'>Feats</span>
        </TabsTrigger>
        <TabsTrigger value='positions' className='text-xs px-1 gap-1' title='Positions'>
          <MapPin className='h-3.5 w-3.5' />
          <span className='hidden xl:inline'>Pos</span>
        </TabsTrigger>
      </TabsList>

      {/* ── Characters Tab ────────────────────────────────────── */}
      <TabsContent value='characters' className='flex-1 flex flex-col mt-0 overflow-hidden'>
        <div className='p-3 space-y-2'>
          {/* Inline create */}
          <Input
            placeholder='New character name... (Enter to create)'
            value={newCharName}
            onChange={(e) => setNewCharName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleInlineCreate()
              }
            }}
            disabled={creating}
            className='h-8 text-sm'
          />

          {/* Search */}
          <div className='relative'>
            <Search className='absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search characters...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='h-8 pl-7 text-sm'
            />
          </div>

          {/* Type filter */}
          <div className='flex items-center gap-2'>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className='h-7 text-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__all'>All Types</SelectItem>
                <SelectItem value='__untyped'>Untyped</SelectItem>
                {CHARACTER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className='text-[11px] text-muted-foreground whitespace-nowrap'>
              {filtered.length}/{characters.length}
            </span>
          </div>
        </div>

        {/* Character list */}
        <ScrollArea className='flex-1'>
          <div
            className='p-2 space-y-1'
            tabIndex={0}
            onKeyDown={handleListKeyDown}
          >
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
                    <span className='flex-1 text-left truncate'>
                      {char.name}
                    </span>
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
                {search || typeFilter !== '__all'
                  ? 'No matching characters'
                  : 'No characters yet'}
              </p>
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      {/* ── Components Tab ────────────────────────────────────── */}
      <TabsContent value='components' className='flex-1 flex flex-col mt-0 overflow-hidden'>
        <ComponentManager components={components} allFeatures={features} />
      </TabsContent>

      {/* ── Features Tab ──────────────────────────────────────── */}
      <TabsContent value='features' className='flex-1 flex flex-col mt-0 overflow-hidden'>
        <FeatureManager features={features} components={components} />
      </TabsContent>

      {/* ── Positions Tab ─────────────────────────────────────── */}
      <TabsContent value='positions' className='flex-1 flex flex-col mt-0 overflow-hidden'>
        <PositionManager positions={positions} />
      </TabsContent>
    </Tabs>
  )
}
