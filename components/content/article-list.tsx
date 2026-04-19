'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Author {
  first_name: string;
  last_name: string;
}

interface Article {
  title: string;
  published_at: string;
  author: Author;
  id: string;
  slug: string;
}

interface ArticleListProps {
  title?: string;
  articles: Article[];
  moreLink: string;
  limit?: number;
}

const joinPath = (base: string, part: string) =>
  `${base.replace(/\/+$/, '')}/${part.replace(/^\/+/, '')}`;

export default function ArticleList({
  title = 'Articles',
  articles = [],
  moreLink,
  limit,
}: ArticleListProps) {
  const displayed = typeof limit === 'number' ? articles.slice(0, limit) : articles;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif font-bold text-foreground tracking-tight">
        {title}
        <span className="block mt-2 w-12 h-1 bg-accent rounded-full" />
      </h2>
      {displayed.length > 0 ? (
        <ul className="space-y-4">
          {displayed.map((article) => (
            <li
              key={article.id}
              className="group rounded-lg border border-border border-l-4 border-l-accent bg-card p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <Link
                href={joinPath(moreLink, article.slug)}
                className="text-primary group-hover:text-primary/80 font-serif font-semibold"
              >
                {article.title}
              </Link>
              <p className="text-sm text-muted-foreground mt-1">
                {`${new Date(article.published_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}${
                  article.author && (article.author.first_name || article.author.last_name)
                    ? ` · ${[article.author.first_name, article.author.last_name].filter(Boolean).join(' ')}`
                    : ''
                }`}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">No articles available.</p>
      )}
      <Button asChild variant="outline">
        <Link href={moreLink}>
          More {typeof title === 'string' ? title.toLowerCase() : 'articles'} →
        </Link>
      </Button>
    </div>
  );
}
