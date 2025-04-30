'use client'

import * as React from 'react'
import { ManuscriptsFilters } from './manuscripts-filters'
import { ManuscriptsTable } from './manuscripts-table'
import { ResultTypeToggle } from './search/search-result-types'
import { Button } from '@/components/ui/button'
import { Grid, List } from 'lucide-react'

export function ManuscriptsSearch() {
  const [, setViewMode] = React.useState<'table' | 'grid'>('table')
  const [resultType, setResultType] = React.useState<string>('')
  
  return (
    <div className='h-screen bg-gray-50'>
      <div className='px-6 py-4 border-b bg-white'>
        <div className='flex items-center justify-between'>
          <h1 className='text-lg font-semibold'>Search: Manuscripts (712)</h1>
          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setViewMode('grid')}
            >
              <Grid className='h-4 w-4' />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setViewMode('table')}
            >
              <List className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </div>
      <div className='flex h-[calc(100vh-73px)]'>
        <ManuscriptsFilters />
        <div className='flex flex-1 flex-col'>
          <div className='px-6 h-[150px] border-b bg-white grid content-center'>

            <ResultTypeToggle
              selectedType={resultType}
              onChange={setResultType}
            />

          </div>
          <div className='p-6 overflow-auto'>
            <ManuscriptsTable />
          </div>
        </div>
      </div>
    </div>
  )
}
