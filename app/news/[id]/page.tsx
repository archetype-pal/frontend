import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getPublicationItem } from '@/utils/api'
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

async function getNewsItem(id: string): Promise<Publication> {
  try {
    const newsItem = await getPublicationItem(id)
    return newsItem
  } catch (error) {
    console.error('Error fetching news item:', error)
    throw error
  }
}

export default async function NewsList({ params }: { params: { id: string } }) {
  const newsItem = await getNewsItem(params.id)

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex flex-col md:flex-row gap-72'>
        <main className='flex-1'>
          <BlogPostPreview
            key={newsItem.id}
            title={newsItem.title}
            author={
              newsItem.author.first_name + ' ' + newsItem.author.last_name
            }
            date={newsItem.published_at}
            excerpt={newsItem.preview}
            slug={newsItem.slug}
            id={newsItem.id}
            commentsCount={newsItem.number_of_comments}
            showShareBtns={false}
            showReadMoreBtn={false}
          />
        </main>
        <aside className='w-full md:w-96'>
          <section className='mb-8'>
            <h2 className='text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2'>
              Recent Posts
            </h2>
            <ul className='space-y-2'>
              {/* {newslist.map((news, index) => (
                <li key={index}>
                  <Link
                    href='#'
                    className='text-blue-600 hover:underline text-sm'
                  >
                    {news.title}
                  </Link>
                </li>
              ))} */}
            </ul>
          </section>
          <section className='mb-8'>
            <h2 className='text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2'>
              Posts by Topic
            </h2>
            <ul className='space-y-1'>
              {/* {postsByTopic.map((topic, index) => (
                <li key={index} className='text-sm'>
                  <Link href='#' className='text-blue-600 hover:underline'>
                    {topic.name}
                  </Link>{' '}
                  ({topic.count})
                </li>
              ))} */}
            </ul>
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
            <ul className='space-y-1'>
              {/* {postsByAuthor.map((author, index) => (
                <li key={index} className='text-sm'>
                  <Link href='#' className='text-blue-600 hover:underline'>
                    {author.name}
                  </Link>{' '}
                  ({author.count})
                </li>
              ))} */}
            </ul>
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
