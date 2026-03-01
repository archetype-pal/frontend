'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Type,
  BookOpen,
  Landmark,
  Newspaper,
  PenTool,
  MessageSquare,
  Image,
  Hash,
  Settings,
  Search,
  Database,
  Library,
  Languages,
  ToggleLeft,
  Users,
  Hand,
  Plus,
  Clock,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useRecentEntities } from '@/hooks/backoffice/use-recent-entities';

interface NavEntry {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
}

const entries: NavEntry[] = [
  { label: 'Dashboard', href: '/backoffice', icon: Settings, group: 'General' },
  // Manuscripts & Palaeography
  {
    label: 'Manuscripts',
    href: '/backoffice/manuscripts',
    icon: BookOpen,
    group: 'Manuscripts & Palaeography',
  },
  {
    label: 'Scribes',
    href: '/backoffice/scribes',
    icon: Users,
    group: 'Manuscripts & Palaeography',
  },
  { label: 'Hands', href: '/backoffice/hands', icon: Hand, group: 'Manuscripts & Palaeography' },
  {
    label: 'Annotations',
    href: '/backoffice/annotations',
    icon: PenTool,
    group: 'Manuscripts & Palaeography',
  },
  {
    label: 'Characters',
    href: '/backoffice/symbols',
    icon: Type,
    group: 'Manuscripts & Palaeography',
  },
  {
    label: 'Repositories',
    href: '/backoffice/repositories',
    icon: Landmark,
    group: 'Manuscripts & Palaeography',
  },
  { label: 'Dates', href: '/backoffice/dates', icon: Hash, group: 'Manuscripts & Palaeography' },
  {
    label: 'Formats',
    href: '/backoffice/formats',
    icon: Library,
    group: 'Manuscripts & Palaeography',
  },
  {
    label: 'Sources',
    href: '/backoffice/sources',
    icon: Database,
    group: 'Manuscripts & Palaeography',
  },
  // Site & Content
  {
    label: 'Publications',
    href: '/backoffice/publications',
    icon: Newspaper,
    group: 'Site & Content',
  },
  { label: 'Comments', href: '/backoffice/comments', icon: MessageSquare, group: 'Site & Content' },
  { label: 'Carousel', href: '/backoffice/carousel', icon: Image, group: 'Site & Content' },
  // Administration
  {
    label: 'Search Engine',
    href: '/backoffice/search-engine',
    icon: Search,
    group: 'Administration',
  },
  {
    label: 'Translations',
    href: '/backoffice/translations',
    icon: Languages,
    group: 'Administration',
  },
  {
    label: 'Site Features',
    href: '/backoffice/site-features',
    icon: ToggleLeft,
    group: 'Administration',
  },
];

const quickActions = [
  { label: 'New Manuscript', href: '/backoffice/manuscripts/new', icon: Plus },
  { label: 'New Publication', href: '/backoffice/publications/new', icon: Plus },
  { label: 'Moderate Comments', href: '/backoffice/comments', icon: MessageSquare },
];

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { entities: recentEntities } = useRecentEntities();

  // Register Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, NavEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.group) ?? [];
      list.push(entry);
      map.set(entry.group, list);
    }
    return Array.from(map.entries());
  }, []);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, actions, or recent items..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Recent entities */}
        {recentEntities.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentEntities.slice(0, 5).map((entity) => (
                <CommandItem
                  key={entity.href}
                  value={`recent ${entity.label}`}
                  onSelect={() => navigate(entity.href)}
                >
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{entity.label}</span>
                  <span className="text-[10px] text-muted-foreground">{entity.type}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Quick actions */}
        <CommandGroup heading="Quick Actions">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <CommandItem
                key={action.href}
                value={`action ${action.label}`}
                onSelect={() => navigate(action.href)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {action.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />

        {/* Navigation pages */}
        {groups.map(([group, items], i) => (
          <div key={group}>
            {i > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.href}
                    value={item.label}
                    onSelect={() => navigate(item.href)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
