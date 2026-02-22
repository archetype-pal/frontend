import IntroSection from '@/components/content/intro-section'
import ArticleList from '@/components/content/article-list'
import { apiFetch } from '@/lib/api-fetch'

async function getPublications(params: { is_news?: boolean; is_featured?: boolean }) {
  const searchParams = new URLSearchParams()
  if (params.is_news) searchParams.append('is_news', 'true')
  if (params.is_featured) searchParams.append('is_featured', 'true')
  const qs = searchParams.toString()
  const path = `/api/v1/media/publications/${qs ? `?${qs}` : ''}`

  try {
    const res = await apiFetch(path)
    if (!res.ok) return []
    const data = await res.json()
    return data.results ?? []
  } catch {
    return []
  }
}

export default async function Home() {
  const [newsArticles, featureArticles] = await Promise.all([
    getPublications({ is_news: true }),
    getPublications({ is_featured: true }),
  ])

  return (
    <main className='flex flex-col gap-8 row-start-2 items-center sm:items-start'>
      <IntroSection />

      <div className='container mx-auto px-4 py-4'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 my-8'>
          <ArticleList
            title='News'
            articles={newsArticles}
            moreLink='/news'
            limit={3}
          />
          <ArticleList
            title='Feature Articles'
            articles={featureArticles}
            moreLink='/feature'
            limit={3}
          />
        </div>
      </div>
    </main>
  )
}
