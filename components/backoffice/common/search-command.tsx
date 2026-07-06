'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
import { useModelLabels } from '@/contexts/model-labels-context';

interface NavEntry {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
}

function getEntries(
  datesLabel: string,
  manuscriptsAppLabel: string,
  t: (key: string) => string
): NavEntry[] {
  return [
    { label: t('search.dashboard'), href: '/backoffice', icon: Settings, group: t('search.groupGeneral') },
    // Manuscripts & Palaeography
    {
      label: manuscriptsAppLabel,
      href: '/backoffice/manuscripts',
      icon: BookOpen,
      group: t('search.groupManuscripts'),
    },
    {
      label: t('search.scribes'),
      href: '/backoffice/scribes',
      icon: Users,
      group: t('search.groupManuscripts'),
    },
    { label: t('search.hands'), href: '/backoffice/hands', icon: Hand, group: t('search.groupManuscripts') },
    {
      label: t('search.annotations'),
      href: '/backoffice/annotations',
      icon: PenTool,
      group: t('search.groupManuscripts'),
    },
    {
      label: t('search.characters'),
      href: '/backoffice/symbols',
      icon: Type,
      group: t('search.groupManuscripts'),
    },
    {
      label: t('search.repositories'),
      href: '/backoffice/repositories',
      icon: Landmark,
      group: t('search.groupManuscripts'),
    },
    {
      label: datesLabel,
      href: '/backoffice/dates',
      icon: Hash,
      group: t('search.groupManuscripts'),
    },
    {
      label: t('search.formats'),
      href: '/backoffice/formats',
      icon: Library,
      group: t('search.groupManuscripts'),
    },
    {
      label: t('search.sources'),
      href: '/backoffice/sources',
      icon: Database,
      group: t('search.groupManuscripts'),
    },
    // Site & Content
    {
      label: t('search.publications'),
      href: '/backoffice/publications',
      icon: Newspaper,
      group: t('search.groupSiteContent'),
    },
    {
      label: t('search.comments'),
      href: '/backoffice/comments',
      icon: MessageSquare,
      group: t('search.groupSiteContent'),
    },
    { label: t('search.carousel'), href: '/backoffice/carousel', icon: Image, group: t('search.groupSiteContent') },
    // Administration
    {
      label: t('search.searchEngine'),
      href: '/backoffice/search-engine',
      icon: Search,
      group: t('search.groupAdmin'),
    },
    {
      label: t('search.translationsNav'),
      href: '/backoffice/translations',
      icon: Languages,
      group: t('search.groupAdmin'),
    },
    {
      label: t('search.siteFeatures'),
      href: '/backoffice/site-features',
      icon: ToggleLeft,
      group: t('search.groupAdmin'),
    },
  ];
}

function getQuickActions(historicalItemLabel: string, t: (key: string) => string) {
  return [
    { label: `New ${historicalItemLabel}`, href: '/backoffice/manuscripts/new', icon: Plus },
    { label: t('search.newPublication'), href: '/backoffice/publications/new', icon: Plus },
    { label: t('search.moderateComments'), href: '/backoffice/comments', icon: MessageSquare },
  ];
}

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { entities: recentEntities } = useRecentEntities();
  const { getLabel, getPluralLabel } = useModelLabels();
  const t = useTranslations('backoffice');
  const entries = useMemo(
    () => getEntries(getPluralLabel('date'), getLabel('appManuscripts'), t),
    [getLabel, getPluralLabel, t]
  );
  const quickActions = useMemo(() => getQuickActions(getLabel('historicalItem'), t), [getLabel, t]);

  // Register Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Caps Lock makes `e.key` come through as 'K', so the literal
      // 'k' check would silently break the quick-search shortcut for
      // caps-locked users.
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
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
  }, [entries]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t('search.inputPlaceholder')} />
      <CommandList>
        <CommandEmpty>{t('search.noResults')}</CommandEmpty>

        {/* Recent entities */}
        {recentEntities.length > 0 && (
          <>
            <CommandGroup heading={t('search.groupRecent')}>
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
        <CommandGroup heading={t('search.groupQuickActions')}>
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
