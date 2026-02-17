'use client'

import { Languages } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function TranslationsPage() {
  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-3'>
        <Languages className='h-6 w-6 text-primary' />
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            Translations
          </h1>
          <p className='text-sm text-muted-foreground'>
            Manage site translations for multi-language support.
          </p>
        </div>
      </div>

      <div className='rounded-lg border bg-card p-6'>
        <div className='flex items-center gap-2 mb-3'>
          <Badge variant='secondary'>Coming Soon</Badge>
        </div>
        <p className='text-sm text-muted-foreground'>
          This page will allow you to manage translations for the public-facing
          site, including page content, labels, and navigation text across
          supported languages.
        </p>
      </div>
    </div>
  )
}
