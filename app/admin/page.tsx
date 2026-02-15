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
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getCharacters } from '@/services/admin/symbols'
import { getHistoricalItems } from '@/services/admin/manuscripts'
import { getPublications, getComments } from '@/services/admin/publications'
import { getScribes } from '@/services/admin/scribes'
import { adminKeys } from '@/lib/admin/query-keys'
import { useRecentEntities } from '@/hooks/admin/use-recent-entities'

interface StatCardProps {
  title: string
  value: number | undefined
  icon: React.ComponentType<{ className?: string }>
  href: string
  loading: boolean
}

function StatCard({ title, value, icon: Icon, href, loading }: StatCardProps) {
  return (
    <Link
      href={href}
      className='group flex items-center gap-4 rounded-lg border bg-card p-5 transition-colors hover:bg-accent/50'
    >
      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary'>
        <Icon className='h-5 w-5' />
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-sm text-muted-foreground'>{title}</p>
        {loading ? (
          <div className='mt-1 h-7 w-12 animate-pulse rounded bg-muted' />
        ) : (
          <p className='text-2xl font-semibold tabular-nums'>
            {value ?? '\u2014'}
          </p>
        )}
      </div>
      <ArrowRight className='h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100' />
    </Link>
  )
}

export default function AdminDashboardPage() {
  const { token } = useAuth()
  const { entities: recentEntities } = useRecentEntities()

  const characters = useQuery({
    queryKey: adminKeys.characters.all(),
    queryFn: () => getCharacters(token!),
    enabled: !!token,
  })

  const manuscripts = useQuery({
    queryKey: adminKeys.manuscripts.list({ limit: 1 }),
    queryFn: () => getHistoricalItems(token!, { limit: 1 }),
    enabled: !!token,
  })

  const publications = useQuery({
    queryKey: adminKeys.publications.list({ limit: 1 }),
    queryFn: () => getPublications(token!, { limit: 1 }),
    enabled: !!token,
  })

  const scribes = useQuery({
    queryKey: adminKeys.scribes.all(),
    queryFn: () => getScribes(token!),
    enabled: !!token,
  })

  const pendingComments = useQuery({
    queryKey: adminKeys.comments.list('pending'),
    queryFn: () => getComments(token!, { is_approved: false }),
    enabled: !!token,
  })

  const pendingCount = pendingComments.data?.count ?? 0

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Dashboard</h1>
        <p className='text-sm text-muted-foreground mt-1'>
          Overview of your Archetype data.
        </p>
      </div>

      {/* Stat cards */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard
          title='Characters'
          value={characters.data?.length}
          icon={Type}
          href='/admin/symbols'
          loading={characters.isLoading}
        />
        <StatCard
          title='Historical Items'
          value={manuscripts.data?.count}
          icon={BookOpen}
          href='/admin/manuscripts'
          loading={manuscripts.isLoading}
        />
        <StatCard
          title='Publications'
          value={publications.data?.count}
          icon={Newspaper}
          href='/admin/publications'
          loading={publications.isLoading}
        />
        <StatCard
          title='Scribes'
          value={scribes.data?.count}
          icon={PenTool}
          href='/admin/scribes'
          loading={scribes.isLoading}
        />
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        {/* Pending actions */}
        <div className='rounded-lg border bg-card p-6'>
          <h2 className='text-base font-medium flex items-center gap-2'>
            <AlertCircle className='h-4 w-4 text-amber-500' />
            Pending Actions
          </h2>
          <div className='mt-4 space-y-2'>
            {pendingCount > 0 ? (
              <Link
                href='/admin/comments'
                className='flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent'
              >
                <MessageSquare className='h-4 w-4 text-muted-foreground' />
                <span className='flex-1'>
                  {pendingCount} pending comment{pendingCount !== 1 ? 's' : ''} awaiting moderation
                </span>
                <Badge variant='destructive' className='text-xs'>
                  {pendingCount}
                </Badge>
              </Link>
            ) : (
              <div className='text-sm text-muted-foreground py-2 px-3'>
                All caught up! No pending actions.
              </div>
            )}
          </div>
        </div>

        {/* Quick create */}
        <div className='rounded-lg border bg-card p-6'>
          <h2 className='text-base font-medium flex items-center gap-2'>
            <Plus className='h-4 w-4 text-primary' />
            Quick Create
          </h2>
          <div className='mt-4 grid gap-2 sm:grid-cols-2'>
            <Link href='/admin/manuscripts/new'>
              <Button variant='outline' className='w-full justify-start gap-2'>
                <BookOpen className='h-4 w-4' />
                New Manuscript
              </Button>
            </Link>
            <Link href='/admin/publications/new'>
              <Button variant='outline' className='w-full justify-start gap-2'>
                <Newspaper className='h-4 w-4' />
                New Publication
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      {recentEntities.length > 0 && (
        <div className='rounded-lg border bg-card p-6'>
          <h2 className='text-base font-medium flex items-center gap-2'>
            <Clock className='h-4 w-4 text-muted-foreground' />
            Recent Activity
          </h2>
          <div className='mt-4 space-y-1'>
            {recentEntities.slice(0, 8).map((entity) => (
              <Link
                key={entity.href}
                href={entity.href}
                className='flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent'
              >
                <Clock className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                <span className='flex-1 truncate'>{entity.label}</span>
                <Badge variant='outline' className='text-[10px] shrink-0'>
                  {entity.type}
                </Badge>
                <span className='text-[10px] text-muted-foreground tabular-nums shrink-0'>
                  {formatTimeAgo(entity.visitedAt)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
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
