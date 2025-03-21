import Link from 'next/link'
import { getPublications } from '@/utils/api'
import BlogPostPreview from '@/components/blog-post-preview'
import { notFound } from 'next/navigation'

interface Author {
  first_name: string
  last_name: string
}

interface Publication {
  id: string
  title: string
  published_at: string
  author: Author
  slug: string
  preview: string
  number_of_comments: number
}

interface Props {
  searchParams?: {
    page?: string
  }
}

export default async function BlogsList({ searchParams }: Props) {
  const limit = 10
  const page = Number(searchParams?.page || 1)
  const offset = (page - 1) * limit

  try {
    const data = await getPublications({ is_blog_post: true, limit, offset })
    const blogsList: Publication[] = data.results
    const total = data.count
    const totalPages = Math.ceil(total / limit)

    if (page > totalPages && totalPages > 0) return notFound()

    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='flex flex-col md:flex-row gap-72'>
          <main className='flex-1'>
            <h1 className='text-3xl font-bold text-gray-800 mb-6'>Blog</h1>

            {blogsList.map((blog) => (
              <BlogPostPreview
                key={blog.id}
                title={blog.title}
                author={blog.author.first_name + ' ' + blog.author.last_name}
                date={blog.published_at}
                excerpt={blog.preview}
                slug={'/blogs/' + blog.id}
                commentsCount={blog.number_of_comments}
                showShareBtns={false}
                showReadMoreBtn={true}
              />
            ))}

            {/* Pagination */}
            <div className='flex justify-between mt-6'>
              <Link
                href={`/blogs?page=${page - 1}`}
                className={`px-4 py-2 border ${page <= 1 ? 'bg-gray-300 text-gray-600 cursor-not-allowed pointer-events-none' : 'bg-blue-500 text-white'}`}
              >
                Previous
              </Link>
              <Link
                href={`/blogs?page=${page + 1}`}
                className={`px-4 py-2 border ${page >= totalPages ? 'bg-gray-300 text-gray-600 cursor-not-allowed pointer-events-none' : 'bg-blue-500 text-white'}`}
              >
                Next
              </Link>
            </div>
          </main>

          {/* Sidebar */}
          <aside className='w-full md:w-96'>
            <section className='mb-8'>
              <h2 className='text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2'>
                Recent Posts
              </h2>
              <ul className='space-y-2'>
                {blogsList.map((blog, index) => (
                  <li key={index}>
                    <Link
                      href={`/blogs/${blog.id}`}
                      className='text-blue-600 hover:underline text-sm'
                    >
                      {blog.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className='mb-8'>
              <h2 className='text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2'>
                Posts by Topic
              </h2>
            </section>

            <section className='mb-8'>
              <h2 className='text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2'>
                Posts by Date
              </h2>
              <select className='w-full border border-gray-300 rounded px-2 py-1 text-sm'>
                <option>Select month</option>
              </select>
            </section>

            <section className='mb-8'>
              <h2 className='text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2'>
                Posts by Author
              </h2>
            </section>

            <section>
              <h2 className='text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2'>
                Feeds
              </h2>
              <Link href='#' className='text-blue-600 hover:underline text-sm'>
                RSS / Atom
              </Link>
            </section>
          </aside>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading blog list:', error)
    return notFound()
  }
}
