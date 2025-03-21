'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getPublications } from '@/utils/api'
import BlogPostPreview from '@/components/blog-post-preview'

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

export default function BlogsList() {
  const [blogs, setBlogs] = useState<Publication[]>([])
  const [nextPage, setNextPage] = useState<string | null>(null)
  const [prevPage, setPrevPage] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const limit = 10

  useEffect(() => {
    fetchBlogs()
  }, [offset])

  async function fetchBlogs() {
    try {
      console.log(`Fetching blogs: offset=${offset}, limit=${limit}`)
      const response = await getPublications({ is_blog_post: true, limit, offset })

      setBlogs(response.results)
      setNextPage(response.next)  // API provides next page URL
      setPrevPage(response.previous)  // API provides previous page URL
    } catch (error) {
      console.error('Error fetching blog posts:', error)
    }
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex flex-col md:flex-row gap-72'>
        <main className='flex-1'>
          <h1 className='text-3xl font-bold text-gray-800 mb-6'>Blog</h1>

          {blogs.length > 0 ? (
            blogs.map((blog) => (
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
            ))
          ) : (
            <p>No blog posts available.</p>
          )}

          {/* Pagination Controls */}
          <div className='flex justify-between mt-6'>
            <button 
              onClick={() => setOffset(offset - limit)}
              disabled={!prevPage}
              className={`px-4 py-2 border ${prevPage ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
            >
              Previous
            </button>

            <button 
              onClick={() => setOffset(offset + limit)}
              disabled={!nextPage}
              className={`px-4 py-2 border ${nextPage ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
            >
              Next
            </button>
          </div>
        </main>

        {/* Sidebar Section */}
        <aside className='w-full md:w-96'>
          <section className='mb-8'>
            <h2 className='text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2'>
              Recent Posts
            </h2>
            <ul className='space-y-2'>
              {blogs.map((blog, index) => (
                <li key={index}>
                  <Link href={`/blogs/${blog.id}`} className='text-blue-600 hover:underline text-sm'>
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
}
