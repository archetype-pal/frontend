import { Suspense } from 'react'
import PaginatedPublications from '@/components/paginated-publications'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading posts...</div>}>
      <PaginatedPublications title="Blogs" categoryFlag="is_blog_post" route="blogs" />
    </Suspense>
  )
}
