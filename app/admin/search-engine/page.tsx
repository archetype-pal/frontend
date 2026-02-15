'use client'

import { useState } from 'react'
import { Search, RefreshCw, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/admin/common/confirm-dialog'

export default function SearchEnginePage() {
  const [rebuildOpen, setRebuildOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)
  const [clearing, setClearing] = useState(false)

  const handleRebuild = async () => {
    setRebuilding(true)
    try {
      // This would call the search engine rebuild API
      // For now, we show the UI pattern
      await new Promise((resolve) => setTimeout(resolve, 2000))
    } finally {
      setRebuilding(false)
      setRebuildOpen(false)
    }
  }

  const handleClear = async () => {
    setClearing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } finally {
      setClearing(false)
      setClearOpen(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-3'>
        <Search className='h-6 w-6 text-primary' />
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            Search Engine
          </h1>
          <p className='text-sm text-muted-foreground'>
            Manage the search index for the public site
          </p>
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='rounded-lg border bg-card p-6 space-y-4'>
          <div className='flex items-center gap-2'>
            <RefreshCw className='h-5 w-5 text-primary' />
            <h2 className='font-medium'>Rebuild Index</h2>
          </div>
          <p className='text-sm text-muted-foreground'>
            Rebuild the entire search index from scratch. This will re-index
            all characters, manuscripts, scribes, and publications.
          </p>
          <Button
            onClick={() => setRebuildOpen(true)}
            disabled={rebuilding}
            className='w-full'
          >
            {rebuilding ? (
              <>
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                Rebuilding...
              </>
            ) : (
              <>
                <RefreshCw className='h-4 w-4 mr-2' />
                Rebuild Index
              </>
            )}
          </Button>
        </div>

        <div className='rounded-lg border bg-card p-6 space-y-4'>
          <div className='flex items-center gap-2'>
            <Trash2 className='h-5 w-5 text-destructive' />
            <h2 className='font-medium'>Clear Index</h2>
          </div>
          <p className='text-sm text-muted-foreground'>
            Remove all entries from the search index. The search will return
            no results until the index is rebuilt.
          </p>
          <Button
            variant='destructive'
            onClick={() => setClearOpen(true)}
            disabled={clearing}
            className='w-full'
          >
            {clearing ? (
              <>
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className='h-4 w-4 mr-2' />
                Clear Index
              </>
            )}
          </Button>
        </div>
      </div>

      <div className='rounded-lg border bg-card p-6'>
        <h2 className='font-medium mb-3'>Index Information</h2>
        <p className='text-sm text-muted-foreground'>
          The search engine uses the configured backend (Meilisearch/Elasticsearch)
          to provide full-text search across the site. Use the Makefile commands
          <code className='mx-1 px-1.5 py-0.5 bg-muted rounded text-xs'>make update_index</code>
          and
          <code className='mx-1 px-1.5 py-0.5 bg-muted rounded text-xs'>make clear_index</code>
          from the infrastructure directory for production deployments.
        </p>
      </div>

      <ConfirmDialog
        open={rebuildOpen}
        onOpenChange={setRebuildOpen}
        title='Rebuild search index?'
        description='This will re-index all content. It may take several minutes for large datasets.'
        confirmLabel='Rebuild'
        variant='default'
        loading={rebuilding}
        onConfirm={handleRebuild}
      />

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title='Clear search index?'
        description='All search data will be removed. The public search will return no results until rebuilt.'
        confirmLabel='Clear'
        loading={clearing}
        onConfirm={handleClear}
      />
    </div>
  )
}
