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
  PenTool,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/admin/common/confirm-dialog'
import {
  getScribe,
  updateScribe,
  deleteScribe,
  getHands,
} from '@/services/admin/scribes'

export default function ScribeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: rawId } = use(params)
  const id = Number(rawId)
  const { token } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: scribe, isLoading } = useQuery({
    queryKey: ['admin', 'scribe', id],
    queryFn: () => getScribe(token!, id),
    enabled: !!token,
  })

  const { data: hands } = useQuery({
    queryKey: ['admin', 'hands', { scribe: id }],
    queryFn: () => getHands(token!, { scribe: id }),
    enabled: !!token,
  })

  const [name, setName] = useState('')
  const [scriptorium, setScriptorium] = useState('')
  const [dirty, setDirty] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (scribe) {
      setName(scribe.name)
      setScriptorium(scribe.scriptorium)
      setDirty(false)
    }
  }, [scribe])

  const saveMut = useMutation({
    mutationFn: () =>
      updateScribe(token!, id, { name, scriptorium } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'scribe', id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'scribes'] })
      setDirty(false)
    },
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteScribe(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'scribes'] })
      router.push('/admin/scribes')
    },
  })

  if (isLoading || !scribe) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    )
  }

  return (
    <div className='max-w-3xl space-y-6'>
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-2'>
          <Link
            href='/admin/scribes'
            className='text-muted-foreground hover:text-foreground'
          >
            <ArrowLeft className='h-4 w-4' />
          </Link>
          <h1 className='text-xl font-semibold'>{scribe.name}</h1>
          {scribe.period_display && (
            <Badge variant='secondary'>{scribe.period_display}</Badge>
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

      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-1.5'>
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setDirty(true)
            }}
          />
        </div>
        <div className='space-y-1.5'>
          <Label>Scriptorium</Label>
          <Input
            value={scriptorium}
            onChange={(e) => {
              setScriptorium(e.target.value)
              setDirty(true)
            }}
          />
        </div>
      </div>

      {/* Hands list */}
      <div className='space-y-3'>
        <h3 className='text-sm font-medium'>
          Hands ({hands?.results?.length ?? 0})
        </h3>
        {hands?.results?.length === 0 ? (
          <p className='text-sm text-muted-foreground py-2'>
            No hands associated with this scribe.
          </p>
        ) : (
          <div className='rounded-md border divide-y'>
            {hands?.results?.map((hand) => (
              <Link
                key={hand.id}
                href={`/admin/hands/${hand.id}`}
                className='flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors'
              >
                <PenTool className='h-4 w-4 text-muted-foreground shrink-0' />
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium'>{hand.name}</p>
                  <p className='text-xs text-muted-foreground truncate'>
                    {hand.item_part_display}
                  </p>
                </div>
                {hand.script_name && (
                  <Badge variant='outline' className='text-xs'>
                    {hand.script_name}
                  </Badge>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${scribe.name}"?`}
        description='This may fail if the scribe has hands associated.'
        confirmLabel='Delete'
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  )
}
