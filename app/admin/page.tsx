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
} from 'lucide-react'
import { getCharacters } from '@/services/admin/symbols'
import { getHistoricalItems } from '@/services/admin/manuscripts'
import { getPublications } from '@/services/admin/publications'
import { getScribes } from '@/services/admin/scribes'

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
            {value ?? '—'}
          </p>
        )}
      </div>
      <ArrowRight className='h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100' />
    </Link>
  )
}

export default function AdminDashboardPage() {
  const { token } = useAuth()

  const characters = useQuery({
    queryKey: ['admin', 'characters'],
    queryFn: () => getCharacters(token!),
    enabled: !!token,
  })

  const manuscripts = useQuery({
    queryKey: ['admin', 'historical-items', { limit: 1 }],
    queryFn: () => getHistoricalItems(token!, { limit: 1 }),
    enabled: !!token,
  })

  const publications = useQuery({
    queryKey: ['admin', 'publications', { limit: 1 }],
    queryFn: () => getPublications(token!, { limit: 1 }),
    enabled: !!token,
  })

  const scribes = useQuery({
    queryKey: ['admin', 'scribes'],
    queryFn: () => getScribes(token!),
    enabled: !!token,
  })

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Dashboard</h1>
        <p className='text-sm text-muted-foreground mt-1'>
          Overview of your Archetype data.
        </p>
      </div>

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

      <div className='rounded-lg border bg-card p-6'>
        <h2 className='text-base font-medium'>Quick Actions</h2>
        <div className='mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
          {[
            { label: 'Manage Characters', href: '/admin/symbols' },
            { label: 'Manage Manuscripts', href: '/admin/manuscripts' },
            { label: 'Manage Publications', href: '/admin/publications' },
            { label: 'Moderate Comments', href: '/admin/comments' },
            { label: 'Manage Carousel', href: '/admin/carousel' },
            { label: 'Search Engine', href: '/admin/search-engine' },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className='flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
            >
              <ArrowRight className='h-3.5 w-3.5' />
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
