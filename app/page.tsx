'use client'
import IntroSection from '@/components/intro-seaction'
import ArticleList from '@/components/article-list'
// import { TwitterTimelineEmbed } from 'react-twitter-embed'
import { getPublications } from '@/utils/api'
import { useEffect, useState } from 'react'

export default function Home() {
  const [newsArticles, setNewsArticles] = useState([])
  const [featureArticles, setFeatureArticles] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [newsData, featuredData] = await Promise.all([
          getPublications({ is_news: true }),
          getPublications({ is_featured: true }),
        ])

        setNewsArticles(newsData.results || [])
        setFeatureArticles(featuredData.results || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [])

  return (
    <main className='flex flex-col gap-8 row-start-2 items-center sm:items-start'>
      <IntroSection />

      <div className='container mx-auto px-4 py-4'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 my-8'>
          <ArticleList
            title='News'
            articles={newsArticles}
            moreLink='/blog/category/news'
          />
          <ArticleList
            title='Feature Articles'
            articles={featureArticles}
            moreLink='/features'
          />
          {/* <TwitterTimelineEmbed
            sourceType='profile'
            screenName='XDevelopers' // Replace with the desired profile's screen name
            options={{ height: 400 }}
          /> */}
        </div>
      </div>
    </main>
  )
}
