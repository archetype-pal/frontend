'use client'

import { use, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Trash2,
  Loader2,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RichTextEditor } from '@/components/admin/common/rich-text-editor'
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
import { adminKeys } from '@/lib/admin/query-keys'
import { formatApiError } from '@/lib/admin/format-api-error'
import { useUnsavedGuard } from '@/hooks/admin/use-unsaved-guard'
import { useKeyboardShortcut } from '@/hooks/admin/use-keyboard-shortcut'
import { useRecentEntities } from '@/hooks/admin/use-recent-entities'

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
    queryKey: adminKeys.publications.detail(slug),
    queryFn: () => getPublication(token!, slug),
    enabled: !!token,
  })

  const { track } = useRecentEntities()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState('')
  const [status, setStatus] = useState<'Draft' | 'Published'>('Draft')
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
      track({ label: pub.title, href: `/admin/publications/${slug}`, type: 'Publication' })
    }
  }, [pub, slug, track])

  // Warn before leaving with unsaved changes
  useUnsavedGuard(dirty)

  const saveMut = useMutation({
    mutationFn: () =>
      updatePublication(token!, slug, {
        title,
        content,
        preview,
        status,
        is_blog_post: isBlog,
        is_news: isNews,
        is_featured: isFeatured,
        allow_comments: allowComments,
        keywords,
      }),
    onSuccess: () => {
      toast.success('Publication saved')
      queryClient.invalidateQueries({
        queryKey: adminKeys.publications.detail(slug),
      })
      queryClient.invalidateQueries({ queryKey: adminKeys.publications.all() })
      setDirty(false)
    },
    onError: (err) => {
      toast.error('Failed to save publication', {
        description: formatApiError(err),
      })
    },
  })

  // Cmd+S to save
  useKeyboardShortcut('mod+s', () => {
    if (dirty && !saveMut.isPending) saveMut.mutate()
  }, dirty)

  const deleteMut = useMutation({
    mutationFn: () => deletePublication(token!, slug),
    onSuccess: () => {
      toast.success('Publication deleted')
      queryClient.invalidateQueries({ queryKey: adminKeys.publications.all() })
      router.push('/admin/publications')
    },
    onError: (err) => {
      toast.error('Failed to delete publication', {
        description: formatApiError(err),
      })
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
              onValueChange={(val) => { setStatus(val as 'Draft' | 'Published'); markDirty() }}
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
          <Tabs defaultValue='editor'>
            <TabsList className='h-8'>
              <TabsTrigger value='editor' className='text-xs'>
                <Save className='h-3 w-3 mr-1' /> Editor
              </TabsTrigger>
              <TabsTrigger value='preview' className='text-xs'>
                <Eye className='h-3 w-3 mr-1' /> Preview
              </TabsTrigger>
            </TabsList>
            <TabsContent value='editor' className='mt-2'>
              <RichTextEditor
                content={content}
                onChange={(html) => { setContent(html); markDirty() }}
                placeholder='Start writing your publication...'
              />
            </TabsContent>
            <TabsContent value='preview' className='mt-2'>
              <div
                className='prose prose-sm dark:prose-invert max-w-none rounded-md border px-4 py-3 min-h-[200px]'
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className='space-y-1.5'>
          <Label>Preview Text</Label>
          <RichTextEditor
            content={preview}
            onChange={(html) => { setPreview(html); markDirty() }}
            placeholder='Short preview text...'
            minimal
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
