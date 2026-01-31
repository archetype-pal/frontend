import { Suspense } from 'react'
import PaginatedPublications from '@/components/content/paginated-publications'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading posts...</div>}>
      <PaginatedPublications title="Feature Articles" categoryFlag="is_featured" route="feature" />
    </Suspense>
  )
}
