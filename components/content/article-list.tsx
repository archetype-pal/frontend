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
  slug: string
}

interface ArticleListProps {
  title?: string
  articles: Article[]
  moreLink: string
  limit?: number
}

const joinPath = (base: string, part: string) =>
  `${base.replace(/\/+$/, '')}/${part.replace(/^\/+/, '')}`

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
                href={joinPath(moreLink, article.slug)}
                className='text-primary hover:underline font-medium'
              >
                {article.title}
              </Link>
              <p className='text-sm text-gray-500'>
                {`${new Date(article.published_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}${article.author && (article.author.first_name || article.author.last_name)
                  ? `, by ${[article.author.first_name, article.author.last_name].filter(Boolean).join(' ')}`
                  : ''}`}
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
