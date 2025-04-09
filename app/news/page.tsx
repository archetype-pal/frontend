import { Suspense } from 'react'
import PaginatedPublications from '@/components/paginated-publications'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading posts...</div>}>
      <PaginatedPublications title="News" categoryFlag="is_news" route="news" />
    </Suspense>
  )
}
