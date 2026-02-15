'use client'

import { cn } from '@/lib/utils'

/** Skeleton shimmer block. */
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
    />
  )
}

/** Skeleton for a DataTable with N rows. */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className='space-y-3'>
      {/* Search bar */}
      <div className='flex items-center gap-2'>
        <Skeleton className='h-9 w-64' />
        <div className='ml-auto'>
          <Skeleton className='h-9 w-24' />
        </div>
      </div>

      {/* Table */}
      <div className='rounded-md border'>
        {/* Header */}
        <div className='flex gap-4 border-b px-4 py-3'>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className='h-4 flex-1' />
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className='flex gap-4 border-b last:border-b-0 px-4 py-3'
          >
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton
                key={j}
                className={cn('h-4 flex-1', j === 0 && 'max-w-16')}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Skeleton for a detail/form page. */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-3'>
        <Skeleton className='h-4 w-4' />
        <Skeleton className='h-7 w-48' />
        <Skeleton className='h-5 w-16 rounded-full' />
      </div>

      {/* Fields */}
      <div className='grid grid-cols-2 gap-4'>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className='space-y-1.5'>
            <Skeleton className='h-4 w-16' />
            <Skeleton className='h-9 w-full' />
          </div>
        ))}
      </div>

      {/* Text area */}
      <div className='space-y-1.5'>
        <Skeleton className='h-4 w-20' />
        <Skeleton className='h-40 w-full' />
      </div>
    </div>
  )
}

/** Skeleton for the symbol tree sidebar. */
export function TreeSkeleton({ items = 8 }: { items?: number }) {
  return (
    <div className='p-3 space-y-2'>
      <Skeleton className='h-9 w-full' />
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className='flex items-center gap-2 px-2 py-1.5'>
          <Skeleton className='h-4 w-4' />
          <Skeleton className='h-4 flex-1' />
          <Skeleton className='h-4 w-6' />
        </div>
      ))}
    </div>
  )
}

/** Skeleton for the dashboard with quick access cards and activity feed. */
export function DashboardSkeleton() {
  return (
    <div className='space-y-8 max-w-5xl'>
      {/* Greeting */}
      <div className='space-y-2'>
        <Skeleton className='h-7 w-64' />
        <Skeleton className='h-4 w-48' />
      </div>

      {/* Pending Tasks */}
      <div className='rounded-lg border'>
        <div className='flex items-center gap-2 border-b px-5 py-3'>
          <Skeleton className='h-4 w-4' />
          <Skeleton className='h-4 w-32' />
        </div>
        <div className='px-5 py-3'>
          <Skeleton className='h-4 w-80' />
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='rounded-lg border p-5 space-y-4'>
            <Skeleton className='h-10 w-10 rounded-lg' />
            <div className='space-y-1.5'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-3 w-32' />
            </div>
          </div>
        ))}
      </div>

      {/* Activity */}
      <div className='rounded-lg border'>
        <div className='flex items-center gap-2 border-b px-5 py-3'>
          <Skeleton className='h-4 w-4' />
          <Skeleton className='h-4 w-28' />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className='flex items-center gap-3 px-5 py-2.5'>
            <Skeleton className='h-4 flex-1' />
            <Skeleton className='h-4 w-16' />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Full-page centered loading spinner for route transitions. */
export function PageLoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className='flex items-center justify-center h-64'>
      <div className='flex flex-col items-center gap-3'>
        <div className='h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent' />
        <p className='text-sm text-muted-foreground'>{message}</p>
      </div>
    </div>
  )
}

export { Skeleton }
