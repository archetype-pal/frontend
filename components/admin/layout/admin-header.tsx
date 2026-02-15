'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  PanelLeftClose,
  PanelLeft,
  LogOut,
  User,
  Keyboard,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRecentEntities } from '@/hooks/admin/use-recent-entities'

interface AdminHeaderProps {
  collapsed: boolean
  onToggleSidebar: () => void
}

/** Maps URL segments to human-readable breadcrumb labels. */
const segmentLabels: Record<string, string> = {
  admin: 'Admin',
  symbols: 'Symbols',
  manuscripts: 'Manuscripts',
  repositories: 'Repositories',
  publications: 'Publications',
  events: 'Events',
  comments: 'Comments',
  carousel: 'Carousel',
  scribes: 'Scribes',
  hands: 'Hands',
  dates: 'Dates',
  formats: 'Formats',
  sources: 'Sources',
  annotations: 'Annotations',
  'search-engine': 'Search Engine',
  new: 'New',
}

function useBreadcrumbs() {
  const pathname = usePathname()
  const { entities: recentEntities } = useRecentEntities()
  const segments = pathname.split('/').filter(Boolean)

  return segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    let label = segmentLabels[segment] ?? decodeURIComponent(segment)

    // Try to resolve entity name from recent entities for dynamic segments
    if (!segmentLabels[segment] && index > 1) {
      const entity = recentEntities.find((e) => e.href === href)
      if (entity) {
        label = entity.label
      }
    }

    const isLast = index === segments.length - 1
    return { href, label, isLast }
  })
}

export function AdminHeader({ collapsed, onToggleSidebar }: AdminHeaderProps) {
  const { user, logout } = useAuth()
  const crumbs = useBreadcrumbs()

  return (
    <header className='flex h-14 items-center gap-3 border-b bg-card px-4'>
      <Button
        variant='ghost'
        size='icon'
        onClick={onToggleSidebar}
        className='h-8 w-8 shrink-0'
      >
        {collapsed ? (
          <PanelLeft className='h-4 w-4' />
        ) : (
          <PanelLeftClose className='h-4 w-4' />
        )}
        <span className='sr-only'>Toggle sidebar</span>
      </Button>

      <Breadcrumb className='flex-1'>
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <React.Fragment key={crumb.href}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage className='max-w-[200px] truncate'>
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Keyboard shortcut hint */}
      <kbd className='hidden sm:inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground'>
        <Keyboard className='h-3 w-3' />
        <span>Ctrl+K</span>
      </kbd>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='sm' className='gap-2 text-xs'>
            <User className='h-4 w-4' />
            <span className='hidden sm:inline'>
              {user?.first_name || user?.username || 'Admin'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-48'>
          <DropdownMenuItem disabled className='text-xs text-muted-foreground'>
            {user?.email}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className='text-destructive'>
            <LogOut className='mr-2 h-4 w-4' />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
