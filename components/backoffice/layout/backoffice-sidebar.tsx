'use client'

import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import {
  ChevronDown,
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
  Wrench,
  ExternalLink,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getComments } from '@/services/backoffice/publications'
import { backofficeKeys } from '@/lib/backoffice/query-keys'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavGroup {
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
}

/**
 * Navigation organised by the professor's mental model, not the database schema.
 *
 * - Scholarly Data: the core entities professors work with daily
 * - Palaeography: the character/allograph/component/feature structure
 * - Site Content: public-facing publications, events, carousel
 * - Reference Data: lookup tables used when editing manuscripts
 * - Tools: rare maintenance operations
 */
const navigation: NavGroup[] = [
  {
    label: 'Scholarly Data',
    icon: BookOpen,
    items: [
      { label: 'Manuscripts', href: '/backoffice/manuscripts', icon: BookOpen },
      { label: 'Repositories', href: '/backoffice/repositories', icon: Landmark },
      { label: 'Scribes', href: '/backoffice/scribes', icon: Users },
      { label: 'Hands', href: '/backoffice/hands', icon: Hand },
      { label: 'Annotations', href: '/backoffice/annotations', icon: PenTool },
    ],
  },
  {
    label: 'Palaeography',
    icon: Type,
    items: [
      { label: 'Characters', href: '/backoffice/symbols', icon: Type },
    ],
  },
  {
    label: 'Site Content',
    icon: Newspaper,
    items: [
      { label: 'Publications', href: '/backoffice/publications', icon: FileText },
      { label: 'Events', href: '/backoffice/events', icon: CalendarDays },
      { label: 'Comments', href: '/backoffice/comments', icon: MessageSquare },
      { label: 'Carousel', href: '/backoffice/carousel', icon: Image },
    ],
  },
  {
    label: 'Reference Data',
    icon: Layers,
    items: [
      { label: 'Dates', href: '/backoffice/dates', icon: Hash },
      { label: 'Formats', href: '/backoffice/formats', icon: Library },
      { label: 'Sources', href: '/backoffice/sources', icon: Database },
    ],
  },
  {
    label: 'Tools',
    icon: Wrench,
    items: [
      { label: 'Search Engine', href: '/backoffice/search-engine', icon: Search },
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

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Brand */}
      <div className='flex h-14 items-center border-b px-4'>
        <Link
          href='/backoffice'
          className='flex items-center gap-2 font-semibold text-sm'
        >
          <LayoutDashboard className='h-5 w-5 shrink-0 text-primary' />
          {!collapsed && <span>Backoffice</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className='flex-1 overflow-y-auto py-2'>
        {navigation.map((group) => (
          <NavGroupSection
            key={group.label}
            group={group}
            pathname={pathname}
            collapsed={collapsed}
            badges={{ '/backoffice/comments': pendingCount }}
          />
        ))}
      </nav>

      {/* Back to site */}
      <div className='border-t p-2'>
        <Link
          href='/'
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <ExternalLink className='h-4 w-4 shrink-0' />
          {!collapsed && <span>View public site</span>}
        </Link>
      </div>
    </aside>
  )
}

function NavGroupSection({
  group,
  pathname,
  collapsed,
  badges = {},
}: {
  group: NavGroup
  pathname: string
  collapsed: boolean
  badges?: Record<string, number>
}) {
  const Icon = group.icon
  const isActive = group.items.some((item) => pathname.startsWith(item.href))

  if (collapsed) {
    // In collapsed mode, show the group icon with a tooltip
    const first = group.items[0]
    return (
      <div className='px-2 py-0.5'>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href={first.href}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md mx-auto',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className='h-4 w-4' />
            </Link>
          </TooltipTrigger>
          <TooltipContent side='right' sideOffset={8}>
            {group.label}
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <Collapsible defaultOpen={isActive} className='px-2 py-0.5'>
      <CollapsibleTrigger className='flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors'>
        <Icon className='h-3.5 w-3.5 shrink-0' />
        <span className='flex-1 text-left'>{group.label}</span>
        <ChevronDown className='h-3 w-3 transition-transform [[data-state=open]>&]:rotate-180' />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className='ml-4 mt-0.5 flex flex-col gap-0.5 border-l pl-2'>
          {group.items.map((item) => {
            const ItemIcon = item.icon
            const active =
              pathname === item.href ||
              pathname.startsWith(item.href + '/')
            const badgeCount = badges[item.href]
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <ItemIcon className='h-3.5 w-3.5 shrink-0' />
                <span className='flex-1'>{item.label}</span>
                {badgeCount != null && badgeCount > 0 ? (
                  <span className='ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground'>
                    {badgeCount}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
