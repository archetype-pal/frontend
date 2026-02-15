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
  { label: 'Search Engine', href: '/admin/search-engine', icon: Search, group: 'System' },
]

export function SearchCommand() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

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
      <CommandInput placeholder='Search admin pages...' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
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
