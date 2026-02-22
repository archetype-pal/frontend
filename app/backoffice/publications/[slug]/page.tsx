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
import { RichTextEditor } from '@/components/backoffice/common/rich-text-editor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog'
import {
  getPublication,
  updatePublication,
  deletePublication,
} from '@/services/backoffice/publications'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import { formatApiError } from '@/lib/backoffice/format-api-error'
import { useUnsavedGuard } from '@/hooks/backoffice/use-unsaved-guard'
import { useKeyboardShortcut } from '@/hooks/backoffice/use-keyboard-shortcut'
import { useRecentEntities } from '@/hooks/backoffice/use-recent-entities'
import { useAutosave } from '@/hooks/backoffice/use-autosave'

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
    queryKey: backofficeKeys.publications.detail(slug),
    queryFn: () => getPublication(token!, slug),
    enabled: !!token,
  })

  const { track } = useRecentEntities()

  const [title, setTitle] = useState('')
  const [pubSlug, setPubSlug] = useState('')
  const [slugLocked, setSlugLocked] = useState(true)
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

  const generateSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  useEffect(() => {
    if (pub) {
      setTitle(pub.title) // eslint-disable-line react-hooks/set-state-in-effect
      setPubSlug(pub.slug)
      setContent(pub.content)
      setPreview(pub.preview)
      setStatus(pub.status)
      setIsBlog(pub.is_blog_post)
      setIsNews(pub.is_news)
      setIsFeatured(pub.is_featured)
      setAllowComments(pub.allow_comments)
      setKeywords(pub.keywords ?? '')
      setDirty(false)
      track({ label: pub.title, href: `/backoffice/publications/${slug}`, type: 'Publication' })
    }
  }, [pub, slug, track])

  // Autosave to localStorage every 30s when dirty
  const autosaveData = { title, pubSlug, content, preview, status, isBlog, isNews, isFeatured, allowComments, keywords }
  const { status: autosaveStatus, discard: discardDraft, recover, getDraftInfo } = useAutosave(
    `publication:${slug}`,
    autosaveData,
    dirty
  )

  // Check for recovered draft on mount
  const [showRecovery, setShowRecovery] = useState(false)
  useEffect(() => {
    const info = getDraftInfo()
    if (info.exists && pub) {
      setShowRecovery(true) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [pub]) // eslint-disable-line react-hooks/exhaustive-deps

  const recoverDraft = () => {
    const draft = recover()
    if (draft) {
      setTitle(draft.title)
      setPubSlug(draft.pubSlug)
      setContent(draft.content)
      setPreview(draft.preview)
      setStatus(draft.status)
      setIsBlog(draft.isBlog)
      setIsNews(draft.isNews)
      setIsFeatured(draft.isFeatured)
      setAllowComments(draft.allowComments)
      setKeywords(draft.keywords)
      setDirty(true)
    }
    setShowRecovery(false)
  }

  const dismissRecovery = () => {
    discardDraft()
    setShowRecovery(false)
  }

  // Warn before leaving with unsaved changes
  useUnsavedGuard(dirty)

  const saveMut = useMutation({
    mutationFn: () =>
      updatePublication(token!, slug, {
        title,
        slug: pubSlug,
        content,
        preview,
        status,
        is_blog_post: isBlog,
        is_news: isNews,
        is_featured: isFeatured,
        allow_comments: allowComments,
        keywords,
      }),
    onSuccess: (data) => {
      toast.success('Publication saved')
      discardDraft()
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.publications.detail(slug),
      })
      queryClient.invalidateQueries({ queryKey: backofficeKeys.publications.all() })
      setDirty(false)
      if (data.slug !== slug) {
        router.replace(`/backoffice/publications/${data.slug}`)
      }
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
      queryClient.invalidateQueries({ queryKey: backofficeKeys.publications.all() })
      router.push('/backoffice/publications')
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
            href='/backoffice/publications'
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

      {/* Recovery banner */}
      {showRecovery && (
        <div className='flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-4 py-3'>
          <span className='text-sm text-amber-800 dark:text-amber-200 flex-1'>
            An autosaved draft was found. Would you like to recover it?
          </span>
          <Button size='sm' variant='outline' className='h-7 text-xs' onClick={recoverDraft}>
            Recover Draft
          </Button>
          <Button size='sm' variant='ghost' className='h-7 text-xs' onClick={dismissRecovery}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Autosave status */}
      {dirty && (
        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          {autosaveStatus === 'saving' && (
            <>
              <Loader2 className='h-3 w-3 animate-spin' />
              <span>Autosaving draft...</span>
            </>
          )}
          {autosaveStatus === 'saved' && (
            <span>Draft autosaved</span>
          )}
          {autosaveStatus === 'idle' && (
            <span>Unsaved changes</span>
          )}
        </div>
      )}

      {/* Form */}
      <div className='space-y-4'>
        <div className='space-y-1.5'>
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (!slugLocked) setPubSlug(generateSlug(e.target.value))
              markDirty()
            }}
          />
        </div>

        <div className='space-y-1.5'>
          <div className='flex items-center justify-between'>
            <Label>Slug</Label>
            <button
              type='button'
              onClick={() => {
                const next = !slugLocked
                setSlugLocked(next)
                if (!next) setPubSlug(generateSlug(title))
              }}
              className='text-xs text-muted-foreground hover:text-foreground'
            >
              {slugLocked ? 'Auto-generate from title' : 'Lock (manual)'}
            </button>
          </div>
          <Input
            value={pubSlug}
            onChange={(e) => {
              setPubSlug(e.target.value)
              setSlugLocked(true)
              markDirty()
            }}
            className='font-mono text-sm'
          />
          <p className='text-xs text-muted-foreground'>
            URL: /blogs/{pubSlug || '...'}
          </p>
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
