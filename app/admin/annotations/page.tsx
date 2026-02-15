'use client'

import { ScanLine } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function AnnotationsPage() {
  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-3'>
        <ScanLine className='h-6 w-6 text-primary' />
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            Annotations
          </h1>
          <p className='text-sm text-muted-foreground'>
            Graphs and graph components are primarily managed through the public annotation tool.
          </p>
        </div>
      </div>

      <div className='rounded-lg border bg-card p-6'>
        <div className='flex items-center gap-2 mb-3'>
          <Badge variant='secondary'>Read-only view</Badge>
        </div>
        <p className='text-sm text-muted-foreground'>
          The annotation editor on the public site is the primary interface for managing
          graphs. This admin view will provide a searchable data table for bulk
          inspection and light editing in a future release.
        </p>
        <p className='text-sm text-muted-foreground mt-2'>
          To manage annotations, use the hand viewer on the public site.
        </p>
      </div>
    </div>
  )
}
