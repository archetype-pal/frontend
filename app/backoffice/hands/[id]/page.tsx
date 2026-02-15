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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog'
import { getHand, updateHand, deleteHand } from '@/services/backoffice/scribes'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import { formatApiError } from '@/lib/backoffice/format-api-error'
import { useUnsavedGuard } from '@/hooks/backoffice/use-unsaved-guard'
import { useKeyboardShortcut } from '@/hooks/backoffice/use-keyboard-shortcut'
import { toast } from 'sonner'

export default function HandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: rawId } = use(params)
  const id = Number(rawId)
  const { token } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: hand, isLoading } = useQuery({
    queryKey: backofficeKeys.hands.detail(id),
    queryFn: () => getHand(token!, id),
    enabled: !!token,
  })

  const [name, setName] = useState('')
  const [place, setPlace] = useState('')
  const [description, setDescription] = useState('')
  const [dirty, setDirty] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (hand) {
      setName(hand.name)
      setPlace(hand.place)
      setDescription(hand.description)
      setDirty(false)
    }
  }, [hand])

  // Warn before leaving with unsaved changes
  useUnsavedGuard(dirty)

  const saveMut = useMutation({
    mutationFn: () =>
      updateHand(token!, id, { name, place, description }),
    onSuccess: () => {
      toast.success('Hand saved')
      queryClient.invalidateQueries({ queryKey: backofficeKeys.hands.detail(id) })
      queryClient.invalidateQueries({ queryKey: backofficeKeys.hands.all() })
      setDirty(false)
    },
    onError: (err) => {
      toast.error('Failed to save hand', {
        description: formatApiError(err),
      })
    },
  })

  // Cmd+S to save
  useKeyboardShortcut('mod+s', () => {
    if (dirty && !saveMut.isPending) saveMut.mutate()
  }, dirty)

  const deleteMut = useMutation({
    mutationFn: () => deleteHand(token!, id),
    onSuccess: () => {
      toast.success('Hand deleted')
      queryClient.invalidateQueries({ queryKey: backofficeKeys.hands.all() })
      router.push('/backoffice/hands')
    },
    onError: (err) => {
      toast.error('Failed to delete hand', {
        description: formatApiError(err),
      })
    },
  })

  if (isLoading || !hand) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    )
  }

  const markDirty = () => setDirty(true)

  return (
    <div className='max-w-3xl space-y-6'>
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-2'>
          <Link
            href='/backoffice/hands'
            className='text-muted-foreground hover:text-foreground'
          >
            <ArrowLeft className='h-4 w-4' />
          </Link>
          <h1 className='text-xl font-semibold'>{hand.name}</h1>
          {hand.script_name && (
            <Badge variant='outline'>{hand.script_name}</Badge>
          )}
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

      <div className='rounded-md border p-4 text-sm space-y-1'>
        <p>
          <span className='text-muted-foreground'>Scribe:</span>{' '}
          <Link
            href={`/backoffice/scribes/${hand.scribe}`}
            className='text-primary hover:underline'
          >
            {hand.scribe_name}
          </Link>
        </p>
        <p>
          <span className='text-muted-foreground'>Item Part:</span>{' '}
          {hand.item_part_display}
        </p>
        {hand.date_display && (
          <p>
            <span className='text-muted-foreground'>Date:</span>{' '}
            {hand.date_display}
          </p>
        )}
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-1.5'>
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); markDirty() }}
          />
        </div>
        <div className='space-y-1.5'>
          <Label>Place</Label>
          <Input
            value={place}
            onChange={(e) => { setPlace(e.target.value); markDirty() }}
          />
        </div>
      </div>

      <div className='space-y-1.5'>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => { setDescription(e.target.value); markDirty() }}
          rows={6}
        />
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${hand.name}"?`}
        description='This cannot be undone.'
        confirmLabel='Delete'
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  )
}
