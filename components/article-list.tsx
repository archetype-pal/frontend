'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Author {
  first_name: string
  last_name: string
}

interface Article {
  title: string
  published_at: string
  author: Author
  id: string
}

interface ArticleListProps {
  title?: string
  articles: Article[]
  moreLink: string
  limit?: number
}

export default function ArticleList({
  title = 'Articles',
  articles = [],
  moreLink,
  limit, 
}: ArticleListProps) {
  const displayed = typeof limit === 'number'
    ? articles.slice(0, limit)
    : articles

  return (
    <div className='space-y-4'>
      <h2 className='text-2xl font-bold text-gray-700'>{title}</h2>
      {displayed.length > 0 ? (
        <ul className='space-y-3'>
          {displayed.map((article) => (
            <li key={article.id}>
              <Link
                href={`${moreLink}/${article.id}`}
                className='text-primary hover:underline font-medium'
              >
                {article.title}
              </Link>
              <p className='text-sm text-gray-500'>
                {article.published_at}, by {article.author.first_name}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No articles available.</p>
      )}
      <Button asChild variant='outline'>
        <Link href={moreLink}>
          More {typeof title === 'string' ? title.toLowerCase() : 'articles'} »
        </Link>
      </Button>
    </div>
  )
}
