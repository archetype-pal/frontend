'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { createPublication } from '@/services/admin/publications'
import { formatApiError } from '@/lib/admin/format-api-error'
import { toast } from 'sonner'

export default function NewPublicationPage() {
  const { token } = useAuth()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugLocked, setSlugLocked] = useState(false)
  const [isBlog, setIsBlog] = useState(false)
  const [isNews, setIsNews] = useState(false)

  // Auto-generate slug from title when not locked
  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!slugLocked) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      )
    }
  }

  const createMut = useMutation({
    mutationFn: () =>
      createPublication(token!, {
        title,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        content: '<p></p>',
        preview: '',
        is_blog_post: isBlog,
        is_news: isNews,
        status: 'Draft',
      }),
    onSuccess: (data) => {
      toast.success('Publication created')
      router.push(`/admin/publications/${data.slug}`)
    },
    onError: (err) => {
      toast.error('Failed to create publication', {
        description: formatApiError(err),
      })
    },
  })

  return (
    <div className='max-w-lg space-y-6'>
      <div className='flex items-center gap-2'>
        <Link
          href='/admin/publications'
          className='text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='h-4 w-4' />
        </Link>
        <h1 className='text-xl font-semibold'>New Publication</h1>
      </div>

      <div className='space-y-4 rounded-lg border p-6'>
        <div className='space-y-1.5'>
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder='My Publication Title'
            autoFocus
          />
        </div>

        <div className='space-y-1.5'>
          <div className='flex items-center justify-between'>
            <Label>Slug</Label>
            <button
              type='button'
              onClick={() => setSlugLocked(!slugLocked)}
              className='text-xs text-muted-foreground hover:text-foreground'
            >
              {slugLocked ? 'Unlock (auto-generate)' : 'Lock (manual)'}
            </button>
          </div>
          <Input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value)
              setSlugLocked(true)
            }}
            placeholder='my-publication-title'
          />
        </div>

        <div className='flex items-center gap-6'>
          <label className='flex items-center gap-2 text-sm'>
            <Switch checked={isBlog} onCheckedChange={setIsBlog} />
            Blog Post
          </label>
          <label className='flex items-center gap-2 text-sm'>
            <Switch checked={isNews} onCheckedChange={setIsNews} />
            News
          </label>
        </div>

        <Button
          onClick={() => createMut.mutate()}
          disabled={!title.trim() || createMut.isPending}
          className='w-full'
        >
          {createMut.isPending ? (
            <Loader2 className='h-4 w-4 mr-2 animate-spin' />
          ) : null}
          Create & Edit
        </Button>
      </div>
    </div>
  )
}
