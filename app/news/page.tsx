import Link from 'next/link'
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

async function getNewsList(page = 1): Promise<Publication[]> {
  try {
    const newsList = await getPublications({ is_news: true })
    console.log('newsList.results', newsList.results)

    return newsList.results
  } catch (error) {
    console.error('Error fetching news list:', error)
    return []
  }
}

export default async function NewsList() {
  const newslist = await getNewsList()

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex flex-col md:flex-row gap-72'>
        <main className='flex-1'>
          <h1 className='text-3xl font-bold text-gray-800 mb-6'>News</h1>

          {newslist.map((news) => (
            <BlogPostPreview
              key={news.id}
              title={news.title}
              author={news.author.first_name + ' ' + news.author.last_name}
              date={news.published_at}
              excerpt={news.preview}
              slug={news.slug}
              id={news.id}
              commentsCount={news.number_of_comments}
              showShareBtns={false}
              showReadMoreBtn={false}
            />

            // <article key={index} className='mb-8 pb-8 border-b border-gray-200'>
            //   <h2 className='text-2xl font-bold text-blue-600 mb-2 text-primary'>
            //     <Link href={`/news/${news.slug}`}>{news.title}</Link>
            //   </h2>
            //   <div className='text-sm text-gray-600 mb-2'>
            //     Posted by: {news.author.first_name} | {news.published_at} |
            //     {news.number_of_comments} Comments
            //   </div>
            //   <hr />
            //   <p
            //     className='mb-4'
            //     dangerouslySetInnerHTML={{ __html: news.preview }}
            //   ></p>
            //   <Link
            //     href={`/news/${news.slug}`}
            //     className='text-blue-600 hover:underline'
            //   >
            //     Read more
            //   </Link>
            // </article>
          ))}
          {/* <div className='mt-4'>
            <button className='px-3 py-1 border border-gray-300 text-gray-600 mr-2'>
              &lt;
            </button>
            <button className='px-3 py-1 border border-gray-300 bg-gray-200 text-gray-800 mr-2'>
              1
            </button>
            <button className='px-3 py-1 border border-gray-300 text-gray-600 mr-2'>
              2
            </button>
            <button className='px-3 py-1 border border-gray-300 text-gray-600'>
              &gt;
            </button>
          </div> */}
        </main>
        <aside className='w-full md:w-96'>
          <section className='mb-8'>
            <h2 className='text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2'>
              Recent Posts
            </h2>
            <ul className='space-y-2'>
              {newslist.map((news, index) => (
                <li key={index}>
                  <Link
                    href='#'
                    className='text-blue-600 hover:underline text-sm'
                  >
                    {news.title}
                  </Link>
                </li>
              ))}
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
