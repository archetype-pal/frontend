'use client';

import Link from 'next/link';
import { User, Calendar, Newspaper, MessageSquare, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import ShareButtons from './share-buttons';
import { sanitizeHtml } from '@/lib/sanitize-html';

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

interface BlogPostPreviewProps {
  title: string;
  author: string;
  date: string;
  excerpt: string;
  slug: string;
  commentsCount?: number;
  showShareBtns: boolean;
  showReadMoreBtn: boolean;
}

export default function BlogPostPreview({
  title,
  author,
  date,
  excerpt,
  slug,
  commentsCount = 0,
  showShareBtns = true,
  showReadMoreBtn = true,
}: BlogPostPreviewProps) {
  const t = useTranslations('content');
  const publicationLabel = slug.includes('/publications/feature')
    ? t('blog.typeFeature')
    : slug.includes('/publications/blogs')
      ? t('blog.typeBlog')
      : t('blog.typeNews');

  return (
    <article className="mb-0">
      <h2 className="text-2xl font-semibold text-primary mb-3">
        <Link href={`${slug}`} className="hover:underline">
          {title}
        </Link>
      </h2>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-4">
        <span className="flex items-center">
          <User className="h-4 w-4 mr-1" />
          {t('blog.postedBy')}
        </span>
        <span className="text-primary font-medium">{author}</span>
        <span className="mx-1">·</span>
        <span className="flex items-center">
          <Calendar className="h-4 w-4 mr-1" />
          <time dateTime={date}>{formatDate(date)}</time>
        </span>
        <span className="mx-1">·</span>
        <Link href={slug} className="flex items-center text-primary hover:underline">
          <Newspaper className="h-4 w-4 mr-1" />
          {publicationLabel}
        </Link>
        <span className="mx-1">·</span>
        <Link href={`${slug}`} className="flex items-center text-primary hover:underline">
          <MessageSquare className="h-4 w-4 mr-1" />
          {t('blog.comments', { count: commentsCount })}
        </Link>
      </div>
      <p className="mb-4" dangerouslySetInnerHTML={{ __html: sanitizeHtml(excerpt) }}></p>

      {showReadMoreBtn && (
        <Link
          href={`${slug}`}
          className="inline-flex items-center px-4 py-2 text-sm text-primary border border-primary rounded hover:bg-primary hover:text-white transition-colors"
        >
          {t('blog.readMore')}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Link>
      )}

      {showShareBtns && (
        <div className="flex items-center gap-2">
          <ShareButtons title={title} author={author} slug={slug} />
        </div>
      )}
    </article>
  );
}
