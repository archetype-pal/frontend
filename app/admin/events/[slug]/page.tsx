'use client'

import { use, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/admin/common/confirm-dialog'
import { RichTextEditor } from '@/components/admin/common/rich-text-editor'
import {
  getEvent,
  updateEvent,
  deleteEvent,
} from '@/services/admin/publications'
import { adminKeys } from '@/lib/admin/query-keys'
import { formatApiError } from '@/lib/admin/format-api-error'
import { useUnsavedGuard } from '@/hooks/admin/use-unsaved-guard'
import { useKeyboardShortcut } from '@/hooks/admin/use-keyboard-shortcut'
import { toast } from 'sonner'

export default function EventEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const { token } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: event, isLoading } = useQuery({
    queryKey: adminKeys.events.detail(slug),
    queryFn: () => getEvent(token!, slug),
    enabled: !!token,
  })

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setContent(event.content)
      setDirty(false)
    }
  }, [event])

  // Warn before leaving with unsaved changes
  useUnsavedGuard(dirty)

  const saveMut = useMutation({
    mutationFn: () => updateEvent(token!, slug, { title, content }),
    onSuccess: () => {
      toast.success('Event saved')
      queryClient.invalidateQueries({ queryKey: adminKeys.events.detail(slug) })
      queryClient.invalidateQueries({ queryKey: adminKeys.events.all() })
      setDirty(false)
    },
    onError: (err) => {
      toast.error('Failed to save event', {
        description: formatApiError(err),
      })
    },
  })

  // Cmd+S to save
  useKeyboardShortcut('mod+s', () => {
    if (dirty && !saveMut.isPending) saveMut.mutate()
  }, dirty)

  const deleteMut = useMutation({
    mutationFn: () => deleteEvent(token!, slug),
    onSuccess: () => {
      toast.success('Event deleted')
      queryClient.invalidateQueries({ queryKey: adminKeys.events.all() })
      router.push('/admin/events')
    },
    onError: (err) => {
      toast.error('Failed to delete event', {
        description: formatApiError(err),
      })
    },
  })

  if (isLoading || !event) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    )
  }

  const markDirty = () => setDirty(true)

  return (
    <div className='max-w-4xl space-y-6'>
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-2'>
          <Link
            href='/admin/events'
            className='text-muted-foreground hover:text-foreground'
          >
            <ArrowLeft className='h-4 w-4' />
          </Link>
          <h1 className='text-xl font-semibold'>{event.title}</h1>
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

      <div className='space-y-4'>
        <div className='space-y-1.5'>
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); markDirty() }}
          />
        </div>
        <div className='space-y-1.5'>
          <Label>Content</Label>
          <RichTextEditor
            content={content}
            onChange={(html) => { setContent(html); markDirty() }}
            placeholder='Write your event content...'
          />
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title='Delete this event?'
        description='This cannot be undone.'
        confirmLabel='Delete'
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  )
}
