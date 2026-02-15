import Link from 'next/link'
import {
  User,
  Calendar,
  Newspaper,
  MessageSquare,
  ArrowRight,
} from 'lucide-react'
import ShareButtons from './share-buttons'

interface BlogPostPreviewProps {
  title: string
  author: string
  date: string
  excerpt: string
  slug: string
  commentsCount?: number
  showShareBtns: boolean
  showReadMoreBtn: boolean
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
  return (
    <article className='mb-8'>
      <h2 className='text-2xl font-semibold text-[#2B4C6F] mb-3'>
        <Link href={`${slug}`} className='hover:underline'>
          {title}
        </Link>
      </h2>
      <div className='flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-4'>
        <span className='flex items-center'>
          <User className='h-4 w-4 mr-1' />
          Posted by:
        </span>
        <Link
          href={`/authors/${author}`}
          className='text-[#2B4C6F] hover:underline font-medium'
        >
          {author}
        </Link>
        <span className='mx-1'>|</span>
        <span className='flex items-center'>
          <Calendar className='h-4 w-4 mr-1' />
          <time dateTime={date}>
            {new Date(date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </time>
        </span>
        <span className='mx-1'>|</span>
        <Link
          href={slug}
          className='flex items-center text-[#2B4C6F] hover:underline'
        >
          <Newspaper className='h-4 w-4 mr-1' />
          News
        </Link>
        <span className='mx-1'>|</span>
        <Link
          href={`${slug}`}
          className='flex items-center text-[#2B4C6F] hover:underline'
        >
          <MessageSquare className='h-4 w-4 mr-1' />
          {commentsCount} Comments
        </Link>
      </div>
      <p className='mb-4' dangerouslySetInnerHTML={{ __html: excerpt }}></p>

      {showReadMoreBtn && (
        <Link
          href={`${slug}`}
          className='inline-flex items-center px-4 py-2 text-sm text-[#2B4C6F] border border-[#2B4C6F] rounded hover:bg-[#2B4C6F] hover:text-white transition-colors'
        >
          Read more
          <ArrowRight className='h-4 w-4 ml-2' />
        </Link>
      )}

      {showShareBtns && (
        <div className='flex items-center gap-2'>
          <ShareButtons title={title} author={author} slug={slug} />
        </div>
      )}
    </article>
  )
}
