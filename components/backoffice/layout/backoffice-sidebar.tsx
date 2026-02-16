'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import {
  LayoutDashboard,
  BookOpen,
  Landmark,
  Newspaper,
  PenTool,
  Type,
  FileText,
  MessageSquare,
  Image,
  CalendarDays,
  Users,
  Hand,
  Search,
  Database,
  Hash,
  Library,
  ExternalLink,
  Settings,
  Languages,
  ToggleLeft,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getComments } from '@/services/backoffice/publications'
import { backofficeKeys } from '@/lib/backoffice/query-keys'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSubGroup {
  label: string
  items: NavItem[]
  defaultOpen?: boolean
}

interface NavGroup {
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
  subGroups?: NavSubGroup[]
}

/**
 * Navigation organised by the professor's mental model:
 *
 * - Manuscripts & Palaeography: primary scholarly entities plus a collapsible
 *   "Supporting Data" sub-group for lookup tables (repositories, dates, etc.)
 * - Site & Content: public-facing publications, events, carousel, comments
 * - Administration: system tools (search engine, translations, feature toggles)
 *
 * "View public site" stays in the footer as a standalone escape hatch.
 */
const navigation: NavGroup[] = [
  {
    label: 'Manuscripts & Palaeography',
    icon: BookOpen,
    items: [
      { label: 'Manuscripts', href: '/backoffice/manuscripts', icon: BookOpen },
      { label: 'Scribes', href: '/backoffice/scribes', icon: Users },
      { label: 'Hands', href: '/backoffice/hands', icon: Hand },
      { label: 'Annotations', href: '/backoffice/annotations', icon: PenTool },
      { label: 'Characters', href: '/backoffice/symbols', icon: Type },
    ],
    subGroups: [
      {
        label: 'Supporting Data',
        defaultOpen: true,
        items: [
          { label: 'Repositories', href: '/backoffice/repositories', icon: Landmark },
          { label: 'Dates', href: '/backoffice/dates', icon: Hash },
          { label: 'Formats', href: '/backoffice/formats', icon: Library },
          { label: 'Sources', href: '/backoffice/sources', icon: Database },
        ],
      },
    ],
  },
  {
    label: 'Site & Content',
    icon: Newspaper,
    items: [
      { label: 'Publications', href: '/backoffice/publications', icon: FileText },
      { label: 'Events', href: '/backoffice/events', icon: CalendarDays },
      { label: 'Comments', href: '/backoffice/comments', icon: MessageSquare },
      { label: 'Carousel', href: '/backoffice/carousel', icon: Image },
    ],
  },
  {
    label: 'Administration',
    icon: Settings,
    items: [
      { label: 'Search Engine', href: '/backoffice/search-engine', icon: Search },
      { label: 'Translations', href: '/backoffice/translations', icon: Languages },
      { label: 'Site Features', href: '/backoffice/site-features', icon: ToggleLeft },
    ],
  },
]

interface BackofficeSidebarProps {
  collapsed: boolean
}

export function BackofficeSidebar({ collapsed }: BackofficeSidebarProps) {
  const pathname = usePathname()
  const { token } = useAuth()

  // Lightweight poll for pending comments (60s)
  const { data: pendingComments } = useQuery({
    queryKey: backofficeKeys.comments.list('pending'),
    queryFn: () => getComments(token!, { is_approved: false }),
    enabled: !!token,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const pendingCount = pendingComments?.count ?? 0
  const badges: Record<string, number> = {
    '/backoffice/comments': pendingCount,
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-64'
      )}
    >
      {/* Brand */}
      <div className='flex h-14 items-center border-b px-4'>
        <Link
          href='/backoffice'
          className='flex items-center gap-2 font-semibold text-base'
        >
          <LayoutDashboard className='h-5 w-5 shrink-0 text-primary' />
          {!collapsed && <span>Backoffice</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className='flex-1 overflow-y-auto py-3'>
        {navigation.map((group, idx) => (
          <NavGroupSection
            key={group.label}
            group={group}
            pathname={pathname}
            collapsed={collapsed}
            badges={badges}
            isFirst={idx === 0}
          />
        ))}
      </nav>

      {/* Footer: View public site */}
      <div className='border-t p-2 flex flex-col gap-0.5'>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href='/'
                className='flex h-9 w-9 items-center justify-center rounded-md mx-auto text-muted-foreground hover:text-foreground transition-colors'
              >
                <ExternalLink className='h-4 w-4 shrink-0' />
              </Link>
            </TooltipTrigger>
            <TooltipContent side='right' sideOffset={8}>
              View public site
            </TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href='/'
            className='flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors'
          >
            <ExternalLink className='h-4 w-4 shrink-0' />
            <span>View public site</span>
          </Link>
        )}
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Collapsible sub-group (localStorage-persisted)
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'backoffice-subgroup-'

function useSubGroupOpen(label: string, defaultOpen: boolean) {
  const key = STORAGE_PREFIX + label.toLowerCase().replace(/\s+/g, '-')

  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return defaultOpen
    const stored = localStorage.getItem(key)
    return stored !== null ? stored === '1' : defaultOpen
  })

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev
      localStorage.setItem(key, next ? '1' : '0')
      return next
    })
  }, [key])

  // Sync with localStorage on mount (SSR hydration safety)
  useEffect(() => {
    const stored = localStorage.getItem(key)
    if (stored !== null) {
      setOpen(stored === '1')
    }
  }, [key])

  return { open, toggle }
}

function CollapsibleSubGroup({
  subGroup,
  pathname,
  badges,
}: {
  subGroup: NavSubGroup
  pathname: string
  badges: Record<string, number>
}) {
  const { open, toggle } = useSubGroupOpen(
    subGroup.label,
    subGroup.defaultOpen ?? true
  )

  return (
    <div className='mt-1'>
      <button
        type='button'
        onClick={toggle}
        className='flex w-full items-center gap-1.5 px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground transition-colors'
      >
        {open ? (
          <ChevronDown className='h-3 w-3 shrink-0' />
        ) : (
          <ChevronRight className='h-3 w-3 shrink-0' />
        )}
        <span>{subGroup.label}</span>
      </button>
      {open && (
        <div className='flex flex-col gap-0.5'>
          {subGroup.items.map((item) => {
            const ItemIcon = item.icon
            const active =
              pathname === item.href || pathname.startsWith(item.href + '/')
            const badgeCount = badges[item.href]
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <ItemIcon className='h-4 w-4 shrink-0' />
                <span className='flex-1'>{item.label}</span>
                {badgeCount != null && badgeCount > 0 ? (
                  <span className='ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium text-destructive-foreground'>
                    {badgeCount}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Nav group section
// ---------------------------------------------------------------------------

function NavGroupSection({
  group,
  pathname,
  collapsed,
  badges = {},
  isFirst = false,
}: {
  group: NavGroup
  pathname: string
  collapsed: boolean
  badges?: Record<string, number>
  isFirst?: boolean
}) {
  const Icon = group.icon

  // Gather all items (including sub-group items) for collapsed mode
  const allItems = [
    ...group.items,
    ...(group.subGroups?.flatMap((sg) => sg.items) ?? []),
  ]

  if (collapsed) {
    return (
      <div className={cn('px-2', !isFirst && 'mt-2 border-t pt-2')}>
        {allItems.map((item) => {
          const ItemIcon = item.icon
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <div key={item.href} className='py-0.5'>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-md mx-auto',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <ItemIcon className='h-4 w-4' />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side='right' sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('px-2', !isFirst && 'mt-3')}>
      {/* Static section header */}
      <div className='flex items-center gap-2 px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
        <Icon className='h-3.5 w-3.5 shrink-0' />
        <span>{group.label}</span>
      </div>

      {/* Primary items */}
      <div className='ml-4 mt-0.5 flex flex-col gap-0.5 border-l pl-2'>
        {group.items.map((item) => {
          const ItemIcon = item.icon
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/')
          const badgeCount = badges[item.href]
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <ItemIcon className='h-4 w-4 shrink-0' />
              <span className='flex-1'>{item.label}</span>
              {badgeCount != null && badgeCount > 0 ? (
                <span className='ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium text-destructive-foreground'>
                  {badgeCount}
                </span>
              ) : null}
            </Link>
          )
        })}

        {/* Collapsible sub-groups */}
        {group.subGroups?.map((sg) => (
          <CollapsibleSubGroup
            key={sg.label}
            subGroup={sg}
            pathname={pathname}
            badges={badges}
          />
        ))}
      </div>
    </div>
  )
}
