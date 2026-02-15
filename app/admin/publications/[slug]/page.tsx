'use client'

import { use, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/admin/common/confirm-dialog'
import {
  getPublication,
  updatePublication,
  deletePublication,
} from '@/services/admin/publications'

export default function PublicationEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const { token } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: pub, isLoading } = useQuery({
    queryKey: ['admin', 'publication', slug],
    queryFn: () => getPublication(token!, slug),
    enabled: !!token,
  })

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState('')
  const [status, setStatus] = useState<string>('Draft')
  const [isBlog, setIsBlog] = useState(false)
  const [isNews, setIsNews] = useState(false)
  const [isFeatured, setIsFeatured] = useState(false)
  const [allowComments, setAllowComments] = useState(true)
  const [keywords, setKeywords] = useState('')
  const [dirty, setDirty] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (pub) {
      setTitle(pub.title)
      setContent(pub.content)
      setPreview(pub.preview)
      setStatus(pub.status)
      setIsBlog(pub.is_blog_post)
      setIsNews(pub.is_news)
      setIsFeatured(pub.is_featured)
      setAllowComments(pub.allow_comments)
      setKeywords(pub.keywords ?? '')
      setDirty(false)
    }
  }, [pub])

  const saveMut = useMutation({
    mutationFn: () =>
      updatePublication(token!, slug, {
        title,
        content,
        preview,
        status: status as any,
        is_blog_post: isBlog,
        is_news: isNews,
        is_featured: isFeatured,
        allow_comments: allowComments,
        keywords,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'publication', slug],
      })
      queryClient.invalidateQueries({ queryKey: ['admin', 'publications'] })
      setDirty(false)
    },
  })

  const deleteMut = useMutation({
    mutationFn: () => deletePublication(token!, slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'publications'] })
      router.push('/admin/publications')
    },
  })

  if (isLoading || !pub) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    )
  }

  const markDirty = () => setDirty(true)

  return (
    <div className='max-w-4xl space-y-6'>
      {/* Header */}
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-2'>
          <Link
            href='/admin/publications'
            className='text-muted-foreground hover:text-foreground'
          >
            <ArrowLeft className='h-4 w-4' />
          </Link>
          <h1 className='text-xl font-semibold line-clamp-1'>
            {pub.title}
          </h1>
          <Badge
            variant={status === 'Published' ? 'default' : 'secondary'}
          >
            {status}
          </Badge>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='text-destructive'
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className='h-3.5 w-3.5 mr-1' />
            Delete
          </Button>
          <Button
            size='sm'
            onClick={() => saveMut.mutate()}
            disabled={!dirty || saveMut.isPending}
          >
            {saveMut.isPending ? (
              <Loader2 className='h-3.5 w-3.5 mr-1 animate-spin' />
            ) : (
              <Save className='h-3.5 w-3.5 mr-1' />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className='space-y-4'>
        <div className='space-y-1.5'>
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); markDirty() }}
          />
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-1.5'>
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(val) => { setStatus(val); markDirty() }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='Draft'>Draft</SelectItem>
                <SelectItem value='Published'>Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-1.5'>
            <Label>Keywords</Label>
            <Input
              value={keywords}
              onChange={(e) => { setKeywords(e.target.value); markDirty() }}
              placeholder='comma, separated, tags'
            />
          </div>
        </div>

        <div className='flex items-center gap-6 py-2'>
          <label className='flex items-center gap-2 text-sm'>
            <Switch
              checked={isBlog}
              onCheckedChange={(c) => { setIsBlog(c); markDirty() }}
            />
            Blog Post
          </label>
          <label className='flex items-center gap-2 text-sm'>
            <Switch
              checked={isNews}
              onCheckedChange={(c) => { setIsNews(c); markDirty() }}
            />
            News
          </label>
          <label className='flex items-center gap-2 text-sm'>
            <Switch
              checked={isFeatured}
              onCheckedChange={(c) => { setIsFeatured(c); markDirty() }}
            />
            Featured
          </label>
          <label className='flex items-center gap-2 text-sm'>
            <Switch
              checked={allowComments}
              onCheckedChange={(c) => { setAllowComments(c); markDirty() }}
            />
            Allow Comments
          </label>
        </div>

        <div className='space-y-1.5'>
          <Label>Content</Label>
          <Textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); markDirty() }}
            rows={16}
            className='font-mono text-sm'
            placeholder='Publication content (HTML)...'
          />
        </div>

        <div className='space-y-1.5'>
          <Label>Preview</Label>
          <Textarea
            value={preview}
            onChange={(e) => { setPreview(e.target.value); markDirty() }}
            rows={4}
            className='font-mono text-sm'
            placeholder='Short preview text (HTML)...'
          />
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title='Delete this publication?'
        description='This will permanently delete this publication and all its comments.'
        confirmLabel='Delete'
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  )
}
