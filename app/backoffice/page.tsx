'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import {
  Type,
  BookOpen,
  Newspaper,
  PenTool,
  ArrowRight,
  Clock,
  MessageSquare,
  Plus,
  AlertTriangle,
  CheckCircle2,
  FileEdit,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getCharacters } from '@/services/backoffice/symbols'
import { getHistoricalItems } from '@/services/backoffice/manuscripts'
import { getPublications, getComments } from '@/services/backoffice/publications'
import { getScribes } from '@/services/backoffice/scribes'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import { useRecentEntities } from '@/hooks/backoffice/use-recent-entities'

// ---------------------------------------------------------------------------
// Greeting helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Time grouping for recent entities
// ---------------------------------------------------------------------------

function timeGroup(timestamp: number): 'today' | 'week' | 'older' {
  const now = Date.now()
  const diff = now - timestamp
  const oneDay = 24 * 60 * 60 * 1000
  if (diff < oneDay) return 'today'
  if (diff < 7 * oneDay) return 'week'
  return 'older'
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ---------------------------------------------------------------------------
// Quick Access Card
// ---------------------------------------------------------------------------

interface QuickAccessCardProps {
  title: string
  description: string
  count: number | undefined
  icon: React.ComponentType<{ className?: string }>
  href: string
  loading: boolean
  recentLabel?: string
}

function QuickAccessCard({
  title,
  description,
  count,
  icon: Icon,
  href,
  loading,
  recentLabel,
}: QuickAccessCardProps) {
  return (
    <Link
      href={href}
      className='group flex flex-col justify-between rounded-lg border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm'
    >
      <div className='flex items-start justify-between'>
        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
          <Icon className='h-5 w-5' />
        </div>
        <ArrowRight className='h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100' />
      </div>
      <div className='mt-4'>
        <div className='flex items-baseline gap-2'>
          <h3 className='text-sm font-medium'>{title}</h3>
          {loading ? (
            <span className='h-4 w-8 animate-pulse rounded bg-muted inline-block' />
          ) : count != null ? (
            <span className='text-xs text-muted-foreground tabular-nums'>
              ({count})
            </span>
          ) : null}
        </div>
        <p className='mt-0.5 text-xs text-muted-foreground'>{description}</p>
        {recentLabel && (
          <p className='mt-2 text-xs text-muted-foreground truncate'>
            <Clock className='inline h-3 w-3 mr-1 -mt-0.5' />
            Last visited: {recentLabel}
          </p>
        )}
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function BackofficeDashboardPage() {
  const { token, user } = useAuth()
  const { entities: recentEntities } = useRecentEntities()

  // Data queries
  const characters = useQuery({
    queryKey: backofficeKeys.characters.all(),
    queryFn: () => getCharacters(token!),
    enabled: !!token,
  })

  const manuscripts = useQuery({
    queryKey: backofficeKeys.manuscripts.list({ limit: 1 }),
    queryFn: () => getHistoricalItems(token!, { limit: 1 }),
    enabled: !!token,
  })

  const publications = useQuery({
    queryKey: backofficeKeys.publications.list({ limit: 1 }),
    queryFn: () => getPublications(token!, { limit: 1 }),
    enabled: !!token,
  })

  const draftPublications = useQuery({
    queryKey: backofficeKeys.publications.list({ status: 'draft' }),
    queryFn: () => getPublications(token!, { status: 'draft', limit: 1 }),
    enabled: !!token,
  })

  const scribes = useQuery({
    queryKey: backofficeKeys.scribes.all(),
    queryFn: () => getScribes(token!),
    enabled: !!token,
  })

  const pendingComments = useQuery({
    queryKey: backofficeKeys.comments.list('pending'),
    queryFn: () => getComments(token!, { is_approved: false }),
    enabled: !!token,
  })

  const pendingCount = pendingComments.data?.count ?? 0
  const draftCount = draftPublications.data?.count ?? 0
  const hasPendingTasks = pendingCount > 0 || draftCount > 0

  // Group recent entities by time
  const todayEntities = recentEntities.filter(
    (e) => timeGroup(e.visitedAt) === 'today'
  )
  const weekEntities = recentEntities.filter(
    (e) => timeGroup(e.visitedAt) === 'week'
  )

  // Find most recent entity per section for Quick Access cards
  const findRecentFor = (prefix: string) =>
    recentEntities.find((e) => e.href.startsWith(prefix))?.label

  const firstName = user?.first_name || user?.username || 'there'

  return (
    <div className='space-y-8 max-w-5xl'>
      {/* Greeting */}
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>
          {getGreeting()}, {firstName}
        </h1>
        <p className='text-sm text-muted-foreground mt-1'>{formatDate()}</p>
      </div>

      {/* Pending Tasks */}
      <div className='rounded-lg border bg-card'>
        <div className='flex items-center gap-2 border-b px-5 py-3'>
          {hasPendingTasks ? (
            <AlertTriangle className='h-4 w-4 text-amber-500' />
          ) : (
            <CheckCircle2 className='h-4 w-4 text-green-500' />
          )}
          <h2 className='text-sm font-medium'>
            {hasPendingTasks ? 'Pending Tasks' : 'All caught up'}
          </h2>
        </div>
        <div className='divide-y'>
          {pendingCount > 0 && (
            <Link
              href='/backoffice/comments'
              className='flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-accent/50'
            >
              <MessageSquare className='h-4 w-4 text-muted-foreground shrink-0' />
              <span className='flex-1'>
                {pendingCount} comment{pendingCount !== 1 ? 's' : ''} awaiting
                moderation
              </span>
              <Badge variant='destructive' className='text-xs'>
                {pendingCount}
              </Badge>
            </Link>
          )}
          {draftCount > 0 && (
            <Link
              href='/backoffice/publications'
              className='flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-accent/50'
            >
              <FileEdit className='h-4 w-4 text-muted-foreground shrink-0' />
              <span className='flex-1'>
                {draftCount} draft publication{draftCount !== 1 ? 's' : ''} to
                review
              </span>
              <Badge variant='secondary' className='text-xs'>
                {draftCount}
              </Badge>
            </Link>
          )}
          {!hasPendingTasks && (
            <div className='px-5 py-3 text-sm text-muted-foreground'>
              No pending tasks. Everything is up to date.
            </div>
          )}
        </div>
      </div>

      {/* Quick Access */}
      <div>
        <h2 className='text-sm font-medium text-muted-foreground mb-3'>
          Quick Access
        </h2>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <QuickAccessCard
            title='Manuscripts'
            description='Historical items, parts, and images'
            count={manuscripts.data?.count}
            icon={BookOpen}
            href='/backoffice/manuscripts'
            loading={manuscripts.isLoading}
            recentLabel={findRecentFor('/backoffice/manuscripts')}
          />
          <QuickAccessCard
            title='Palaeography'
            description='Characters, allographs, and features'
            count={characters.data?.length}
            icon={Type}
            href='/backoffice/symbols'
            loading={characters.isLoading}
            recentLabel={findRecentFor('/backoffice/symbols')}
          />
          <QuickAccessCard
            title='Publications'
            description='Blog posts, news, and features'
            count={publications.data?.count}
            icon={Newspaper}
            href='/backoffice/publications'
            loading={publications.isLoading}
            recentLabel={findRecentFor('/backoffice/publications')}
          />
          <QuickAccessCard
            title='Scribes'
            description='Scribes and their hands'
            count={scribes.data?.count}
            icon={PenTool}
            href='/backoffice/scribes'
            loading={scribes.isLoading}
            recentLabel={findRecentFor('/backoffice/scribes')}
          />
        </div>
      </div>

      {/* Quick Create */}
      <div className='flex items-center gap-3'>
        <Plus className='h-4 w-4 text-muted-foreground' />
        <span className='text-sm font-medium text-muted-foreground'>
          Quick create:
        </span>
        <Link href='/backoffice/manuscripts/new'>
          <Button variant='outline' size='sm' className='gap-1.5'>
            <BookOpen className='h-3.5 w-3.5' />
            New Manuscript
          </Button>
        </Link>
        <Link href='/backoffice/publications/new'>
          <Button variant='outline' size='sm' className='gap-1.5'>
            <Newspaper className='h-3.5 w-3.5' />
            New Publication
          </Button>
        </Link>
      </div>

      {/* Recently Edited */}
      {recentEntities.length > 0 && (
        <div className='rounded-lg border bg-card'>
          <div className='flex items-center gap-2 border-b px-5 py-3'>
            <Clock className='h-4 w-4 text-muted-foreground' />
            <h2 className='text-sm font-medium'>Recently Edited</h2>
          </div>
          <div className='divide-y'>
            {todayEntities.length > 0 && (
              <div>
                <div className='px-5 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/50'>
                  Today
                </div>
                {todayEntities.slice(0, 5).map((entity) => (
                  <Link
                    key={entity.href}
                    href={entity.href}
                    className='flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-accent/50'
                  >
                    <span className='flex-1 truncate'>{entity.label}</span>
                    <Badge
                      variant='outline'
                      className='text-[10px] shrink-0'
                    >
                      {entity.type}
                    </Badge>
                    <span className='text-[10px] text-muted-foreground tabular-nums shrink-0 w-16 text-right'>
                      {formatTimeAgo(entity.visitedAt)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {weekEntities.length > 0 && (
              <div>
                <div className='px-5 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/50'>
                  Earlier this week
                </div>
                {weekEntities.slice(0, 5).map((entity) => (
                  <Link
                    key={entity.href}
                    href={entity.href}
                    className='flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-accent/50'
                  >
                    <span className='flex-1 truncate'>{entity.label}</span>
                    <Badge
                      variant='outline'
                      className='text-[10px] shrink-0'
                    >
                      {entity.type}
                    </Badge>
                    <span className='text-[10px] text-muted-foreground tabular-nums shrink-0 w-16 text-right'>
                      {formatTimeAgo(entity.visitedAt)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
