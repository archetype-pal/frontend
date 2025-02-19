import Link from 'next/link'
import { useState, useEffect } from 'react'
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

async function getBlogsList(page = 1): Promise<Publication[]> {
  try {
    const blogsList = await getPublications({ is_blog_post: true })

    return blogsList.results
  } catch (error) {
    console.error('Error fetching news list:', error)
    return []
  }
}

export default async function blogsList() {
  const blogsList = await getBlogsList()

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
        </main>
        <aside className='w-full md:w-96'>
          <section className='mb-8'>
            <h2 className='text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2'>
              Recent Posts
            </h2>
            <ul className='space-y-2'>
              {blogsList.map((blog, index) => (
                <li key={index}>
                  <Link
                    href='#'
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
}
