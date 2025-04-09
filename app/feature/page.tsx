import { Suspense } from 'react'
import PaginatedPublications from '@/components/paginated-publications'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading posts...</div>}>
      <PaginatedPublications title="Feature Articles" categoryFlag="is_featured" route="feature" />
    </Suspense>
  )
}
