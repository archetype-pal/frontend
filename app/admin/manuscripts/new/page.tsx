'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createHistoricalItem } from '@/services/admin/manuscripts'
import { formatApiError } from '@/lib/admin/format-api-error'
import { toast } from 'sonner'

const ITEM_TYPES = ['charter', 'book', 'roll', 'single sheet', 'other']

export default function NewManuscriptPage() {
  const { token } = useAuth()
  const router = useRouter()
  const [type, setType] = useState('charter')
  const [language, setLanguage] = useState('')

  const createMut = useMutation({
    mutationFn: () =>
      createHistoricalItem(token!, { type, language: language || undefined }),
    onSuccess: (data) => {
      toast.success('Manuscript created')
      router.push(`/admin/manuscripts/${data.id}`)
    },
    onError: (err) => {
      toast.error('Failed to create manuscript', {
        description: formatApiError(err),
      })
    },
  })

  return (
    <div className='max-w-lg space-y-6'>
      <div className='flex items-center gap-2'>
        <Link
          href='/admin/manuscripts'
          className='text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='h-4 w-4' />
        </Link>
        <h1 className='text-xl font-semibold'>New Historical Item</h1>
      </div>

      <div className='space-y-4 rounded-lg border p-6'>
        <div className='space-y-1.5'>
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEM_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-1.5'>
          <Label>Language (optional)</Label>
          <Input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder='e.g. Latin'
          />
        </div>

        <Button
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
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
