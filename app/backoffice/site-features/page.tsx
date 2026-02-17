'use client'

import { ToggleLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function SiteFeaturesPage() {
  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-3'>
        <ToggleLeft className='h-6 w-6 text-primary' />
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            Site Features
          </h1>
          <p className='text-sm text-muted-foreground'>
            Enable or disable site features and functionality.
          </p>
        </div>
      </div>

      <div className='rounded-lg border bg-card p-6'>
        <div className='flex items-center gap-2 mb-3'>
          <Badge variant='secondary'>Coming Soon</Badge>
        </div>
        <p className='text-sm text-muted-foreground'>
          This page will allow you to toggle site features on and off, such as
          the lightbox, commenting, blog, and other configurable sections of
          the public site.
        </p>
      </div>
    </div>
  )
}
