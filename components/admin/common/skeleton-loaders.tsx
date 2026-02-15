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

export { Skeleton }
