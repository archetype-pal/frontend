import { Suspense } from 'react'
import { SearchPage } from '@/components/search/search-page'

export default function ManuscriptsSearchPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-50"><p className="text-muted-foreground">Loading search…</p></div>}>
      <SearchPage />
    </Suspense>
  )
}
