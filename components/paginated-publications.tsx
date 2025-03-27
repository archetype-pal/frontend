'use client'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
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

interface PaginatedPublicationsProps {
  title: string
  categoryFlag: 'is_blog_post' | 'is_news' | 'is_featured'
  route: string
}

export default function PaginatedPublications({ title, categoryFlag, route }: PaginatedPublicationsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const page = Number(searchParams.get('page') || 1)
  const limit = 10
  const offset = (page - 1) * limit

  const [articles, setArticles] = useState<Publication[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params: any = { limit, offset }
        params[categoryFlag] = true

        const data = await getPublications(params)
        setArticles(data.results)
        setTotal(data.count)
      } catch (error) {
        console.error(`Error fetching ${title.toLowerCase()} posts:`, error)
      }
    }

    fetchData()
  }, [offset])

  const totalPages = Math.ceil(total / limit)

  const goToPage = (newPage: number) => {
    router.push(`/${route}?page=${newPage}`)
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex flex-col md:flex-row gap-72'>
        <main className='flex-1'>
          <h1 className='text-3xl font-bold text-gray-800 mb-6'>{title}</h1>

          {articles.map((article) => (
            <BlogPostPreview
              key={article.id}
              title={article.title}
              author={article.author.first_name + ' ' + article.author.last_name}
              date={article.published_at}
              excerpt={article.preview}
              slug={`/${route}/${article.slug}`}
              commentsCount={article.number_of_comments}
              showShareBtns={false}
              showReadMoreBtn={true}
            />
          ))}

          <div className='flex justify-between mt-6'>
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className={`px-4 py-2 border rounded ${page <= 1 ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-500 text-white'}`}
            >
              Previous
            </button>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className={`px-4 py-2 border rounded ${page >= totalPages ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-500 text-white'}`}
            >
              Next
            </button>
          </div>
        </main>

        <aside className='w-full md:w-96'>
          <section className='mb-8'>
            <h2 className='text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2'>Recent Posts</h2>
            <ul className='space-y-2'>
              {articles.map((article, index) => (
                <li key={index}>
                  {/* <Link href={`/${route}/${article.id}`} className='text-blue-600 hover:underline text-sm'> */}
                  <Link href={`${article.slug}`} className='text-blue-600 hover:underline text-sm'>
                    {article.title}
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
