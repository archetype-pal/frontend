import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { SearchPage } from '@/components/search/SearchPage'
import { SEARCH_RESULT_TYPES, type ResultType } from '@/lib/search-types'

const VALID = new Set<string>(SEARCH_RESULT_TYPES)

function SearchFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <p className="text-muted-foreground">Loading search…</p>
    </div>
  )
}

export default function SearchTypePage({ params }: { params: { type: string } }) {
  const type = VALID.has(params.type) ? (params.type as ResultType) : null
  if (!type) {
    redirect('/search/manuscripts')
  }
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchPage resultType={type} />
    </Suspense>
  )
}
