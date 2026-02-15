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
  Settings,
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { getComments } from '@/services/admin/publications'
import { adminKeys } from '@/lib/admin/query-keys'

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

const navigation: NavGroup[] = [
  {
    label: 'Symbols',
    icon: Type,
    items: [
      { label: 'Characters', href: '/admin/symbols', icon: Type },
    ],
  },
  {
    label: 'Manuscripts',
    icon: BookOpen,
    items: [
      { label: 'Historical Items', href: '/admin/manuscripts', icon: BookOpen },
      { label: 'Repositories', href: '/admin/repositories', icon: Landmark },
    ],
  },
  {
    label: 'Publications',
    icon: Newspaper,
    items: [
      { label: 'Publications', href: '/admin/publications', icon: FileText },
      { label: 'Events', href: '/admin/events', icon: CalendarDays },
      { label: 'Comments', href: '/admin/comments', icon: MessageSquare },
      { label: 'Carousel', href: '/admin/carousel', icon: Image },
    ],
  },
  {
    label: 'Scribes',
    icon: PenTool,
    items: [
      { label: 'Scribes', href: '/admin/scribes', icon: Users },
      { label: 'Hands', href: '/admin/hands', icon: Hand },
    ],
  },
  {
    label: 'System',
    icon: Settings,
    items: [
      { label: 'Dates', href: '/admin/dates', icon: Hash },
      { label: 'Formats', href: '/admin/formats', icon: Library },
      { label: 'Sources', href: '/admin/sources', icon: Database },
      { label: 'Annotations', href: '/admin/annotations', icon: PenTool },
      { label: 'Search Engine', href: '/admin/search-engine', icon: Search },
    ],
  },
]

interface AdminSidebarProps {
  collapsed: boolean
}

export function AdminSidebar({ collapsed }: AdminSidebarProps) {
  const pathname = usePathname()
  const { token } = useAuth()

  // Lightweight poll for pending comments (60s)
  const { data: pendingComments } = useQuery({
    queryKey: adminKeys.comments.list('pending'),
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
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Brand */}
      <div className='flex h-14 items-center border-b px-4'>
        <Link
          href='/admin'
          className='flex items-center gap-2 font-semibold text-sm'
        >
          <LayoutDashboard className='h-5 w-5 shrink-0' />
          {!collapsed && <span>Admin</span>}
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
            badges={{ '/admin/comments': pendingCount }}
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
          <BookOpen className='h-4 w-4 shrink-0' />
          {!collapsed && <span>Back to site</span>}
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
    // In collapsed mode, show only the first item's icon as a link
    const first = group.items[0]
    return (
      <div className='px-2 py-0.5'>
        <Link
          href={first.href}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md mx-auto',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
          title={group.label}
        >
          <Icon className='h-4 w-4' />
        </Link>
      </div>
    )
  }

  return (
    <Collapsible defaultOpen={isActive} className='px-2 py-0.5'>
      <CollapsibleTrigger className='flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors'>
        <Icon className='h-4 w-4 shrink-0' />
        <span className='flex-1 text-left'>{group.label}</span>
        <ChevronDown className='h-3 w-3 transition-transform [[data-state=open]>&]:rotate-180' />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className='ml-4 mt-0.5 flex flex-col gap-0.5 border-l pl-2'>
          {group.items.map((item) => {
            const ItemIcon = item.icon
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
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
                {badges[item.href] && badges[item.href] > 0 ? (
                  <span className='ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground'>
                    {badges[item.href]}
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
