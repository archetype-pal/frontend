import PaginatedPublications from '@/components/paginated-publications'

export default function Page() {
  return <PaginatedPublications title="Blogs" categoryFlag="is_blog_post" route="blogs" />
}
