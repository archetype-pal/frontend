'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Type,
  BookOpen,
  Newspaper,
  PenTool,
  CalendarDays,
  MessageSquare,
  Image,
  Hash,
  Settings,
  Search,
  Plus,
  Clock,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useRecentEntities } from '@/hooks/admin/use-recent-entities'

interface NavEntry {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  group: string
}

const entries: NavEntry[] = [
  { label: 'Dashboard', href: '/admin', icon: Settings, group: 'General' },
  { label: 'Characters', href: '/admin/symbols', icon: Type, group: 'Symbols' },
  { label: 'Historical Items', href: '/admin/manuscripts', icon: BookOpen, group: 'Manuscripts' },
  { label: 'Repositories', href: '/admin/repositories', icon: BookOpen, group: 'Manuscripts' },
  { label: 'Publications', href: '/admin/publications', icon: Newspaper, group: 'Publications' },
  { label: 'Events', href: '/admin/events', icon: CalendarDays, group: 'Publications' },
  { label: 'Comments', href: '/admin/comments', icon: MessageSquare, group: 'Publications' },
  { label: 'Carousel', href: '/admin/carousel', icon: Image, group: 'Publications' },
  { label: 'Scribes', href: '/admin/scribes', icon: PenTool, group: 'Scribes' },
  { label: 'Hands', href: '/admin/hands', icon: PenTool, group: 'Scribes' },
  { label: 'Dates', href: '/admin/dates', icon: Hash, group: 'System' },
  { label: 'Formats', href: '/admin/formats', icon: Hash, group: 'System' },
  { label: 'Sources', href: '/admin/sources', icon: Hash, group: 'System' },
  { label: 'Search Engine', href: '/admin/search-engine', icon: Search, group: 'System' },
]

const quickActions = [
  { label: 'New Manuscript', href: '/admin/manuscripts/new', icon: Plus },
  { label: 'New Publication', href: '/admin/publications/new', icon: Plus },
  { label: 'Moderate Comments', href: '/admin/comments', icon: MessageSquare },
]

export function SearchCommand() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { entities: recentEntities } = useRecentEntities()

  // Register Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const groups = useMemo(() => {
    const map = new Map<string, NavEntry[]>()
    for (const entry of entries) {
      const list = map.get(entry.group) ?? []
      list.push(entry)
      map.set(entry.group, list)
    }
    return Array.from(map.entries())
  }, [])

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder='Search pages, actions, or recent items...' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Recent entities */}
        {recentEntities.length > 0 && (
          <>
            <CommandGroup heading='Recent'>
              {recentEntities.slice(0, 5).map((entity) => (
                <CommandItem
                  key={entity.href}
                  value={`recent ${entity.label}`}
                  onSelect={() => navigate(entity.href)}
                >
                  <Clock className='mr-2 h-4 w-4 text-muted-foreground' />
                  <span className='flex-1'>{entity.label}</span>
                  <span className='text-[10px] text-muted-foreground'>
                    {entity.type}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Quick actions */}
        <CommandGroup heading='Quick Actions'>
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <CommandItem
                key={action.href}
                value={`action ${action.label}`}
                onSelect={() => navigate(action.href)}
              >
                <Icon className='mr-2 h-4 w-4' />
                {action.label}
              </CommandItem>
            )
          })}
        </CommandGroup>
        <CommandSeparator />

        {/* Navigation pages */}
        {groups.map(([group, items], i) => (
          <div key={group}>
            {i > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <CommandItem
                    key={item.href}
                    value={item.label}
                    onSelect={() => navigate(item.href)}
                  >
                    <Icon className='mr-2 h-4 w-4' />
                    {item.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
