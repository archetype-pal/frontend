'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

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

// Format a date string, returning '' for null/empty/malformed input so the UI
// never surfaces the literal 'Invalid Date' to readers.
const formatDate = (value: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export default function ArticleList({
  title = 'Articles',
  articles = [],
  moreLink,
  limit,
}: ArticleListProps) {
  const displayed = typeof limit === 'number' ? articles.slice(0, limit) : articles;

  return (
    <div>
      <h2
        className="text-3xl md:text-4xl font-light tracking-tight text-foreground mb-8"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h2>

      {displayed.length > 0 ? (
        <ul className="divide-y divide-border">
          {displayed.map((article) => {
            const formattedDate = formatDate(article.published_at);
            const authorName =
              article.author && (article.author.first_name || article.author.last_name)
                ? [article.author.first_name, article.author.last_name].filter(Boolean).join(' ')
                : '';
            return (
              <li key={article.id} className="group py-5 first:pt-0">
                <Link href={joinPath(moreLink, article.slug)} className="block">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                    {[formattedDate, authorName].filter(Boolean).join(' · ')}
                  </p>
                  <h3 className="text-base md:text-lg font-serif font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                    {article.title}
                  </h3>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground italic">No articles available.</p>
      )}

      <Link
        href={moreLink}
        className="inline-flex items-center gap-2 mt-6 text-sm font-medium text-primary hover:gap-3 transition-all group"
      >
        All {typeof title === 'string' ? title.toLowerCase() : 'articles'}
        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}
