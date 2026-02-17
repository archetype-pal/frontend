'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
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
import { FieldLabel } from '@/components/backoffice/common/help-tooltip'
import {
  createHistoricalItem,
  createItemPart,
  createCurrentItem,
  getCurrentItems,
  getRepositories,
  getDates,
} from '@/services/backoffice/manuscripts'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import { formatApiError } from '@/lib/backoffice/format-api-error'
import { toast } from 'sonner'
import type { Repository } from '@/types/backoffice'

const ITEM_TYPES = ['charter', 'book', 'roll', 'single sheet', 'other']

export default function NewManuscriptPage() {
  const { token } = useAuth()
  const router = useRouter()

  // Location fields
  const [repository, setRepository] = useState('')
  const [shelfmark, setShelfmark] = useState('')
  const [locus, setLocus] = useState('')

  // Historical identity fields
  const [type, setType] = useState('charter')
  const [language, setLanguage] = useState('')
  const [date, setDate] = useState('')

  const { data: repositoriesData } = useQuery({
    queryKey: backofficeKeys.repositories.all(),
    queryFn: () => getRepositories(token!),
    enabled: !!token,
  })

  const { data: datesData } = useQuery({
    queryKey: backofficeKeys.dates.all(),
    queryFn: () => getDates(token!),
    enabled: !!token,
  })

  const repositories: Repository[] = repositoriesData?.results ?? repositoriesData ?? []
  const dates = datesData ?? []

  const createMut = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Not authenticated')

      // Step 1: Find or create CurrentItem (if repository & shelfmark provided)
      let currentItemId: number | null = null
      if (repository && shelfmark.trim()) {
        const existing = await getCurrentItems(token, {
          repository: Number(repository),
          limit: 500,
        })
        const match = existing.results.find(
          (ci) => ci.shelfmark.toLowerCase() === shelfmark.trim().toLowerCase()
        )
        if (match) {
          currentItemId = match.id
        } else {
          const newCi = await createCurrentItem(token, {
            repository: Number(repository),
            shelfmark: shelfmark.trim(),
          })
          currentItemId = newCi.id
        }
      }

      // Step 2: Create HistoricalItem
      const historicalItem = await createHistoricalItem(token, {
        type,
        language: language || undefined,
        date: date ? Number(date) : undefined,
      })

      // Step 3: Create ItemPart linking them
      if (currentItemId != null) {
        await createItemPart(token, {
          historical_item: historicalItem.id,
          current_item: currentItemId,
          current_item_locus: locus.trim() || '',
        })
      }

      return historicalItem
    },
    onSuccess: (data) => {
      toast.success('Manuscript created')
      router.push(`/backoffice/manuscripts/${data.id}`)
    },
    onError: (err) => {
      toast.error('Failed to create manuscript', {
        description: formatApiError(err),
      })
    },
  })

  const showShelfmarkWarning = repository && !shelfmark.trim()

  return (
    <div className='max-w-lg space-y-6'>
      <div className='flex items-center gap-2'>
        <Link
          href='/backoffice/manuscripts'
          className='text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='h-4 w-4' />
        </Link>
        <h1 className='text-xl font-semibold'>New Manuscript</h1>
      </div>

      {/* Section 1: Physical Location */}
      <div className='space-y-4 rounded-lg border p-6'>
        <div>
          <h2 className='text-sm font-medium'>Where is it held?</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            The archive and shelf reference for this document.
          </p>
        </div>

        <div className='space-y-3'>
          <div className='space-y-1.5'>
            <FieldLabel helpField='currentLocation.repository'>
              Repository
            </FieldLabel>
            <Select value={repository} onValueChange={setRepository}>
              <SelectTrigger>
                <SelectValue placeholder='Select repository...' />
              </SelectTrigger>
              <SelectContent>
                {repositories.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.label || r.name} ({r.place})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-1.5'>
            <FieldLabel helpField='currentLocation.shelfmark'>
              Shelfmark
            </FieldLabel>
            <Input
              value={shelfmark}
              onChange={(e) => setShelfmark(e.target.value)}
              placeholder='e.g. GD55/1'
            />
            {showShelfmarkWarning && (
              <p className='text-xs text-amber-600 flex items-center gap-1 mt-1'>
                <AlertCircle className='h-3 w-3' />
                A shelfmark is recommended so the manuscript can be identified later.
              </p>
            )}
          </div>

          <div className='space-y-1.5'>
            <FieldLabel helpField='itemPart.locus'>
              Locus <span className='text-muted-foreground font-normal'>(optional)</span>
            </FieldLabel>
            <Input
              value={locus}
              onChange={(e) => setLocus(e.target.value)}
              placeholder='e.g. f.1r'
            />
          </div>
        </div>
      </div>

      {/* Section 2: Historical Identity */}
      <div className='space-y-4 rounded-lg border p-6'>
        <div>
          <h2 className='text-sm font-medium'>What is it?</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            The historical identity and classification of this document.
          </p>
        </div>

        <div className='space-y-3'>
          <div className='space-y-1.5'>
            <FieldLabel helpField='manuscript.type'>Type</FieldLabel>
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
            <Label>
              Language <span className='text-muted-foreground font-normal'>(optional)</span>
            </Label>
            <Input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder='e.g. Latin'
            />
          </div>

          <div className='space-y-1.5'>
            <Label>
              Date <span className='text-muted-foreground font-normal'>(optional)</span>
            </Label>
            <Select value={date} onValueChange={setDate}>
              <SelectTrigger>
                <SelectValue placeholder='Select date...' />
              </SelectTrigger>
              <SelectContent>
                {dates.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Button
        onClick={() => createMut.mutate()}
        disabled={createMut.isPending || !type}
        className='w-full'
      >
        {createMut.isPending ? (
          <Loader2 className='h-4 w-4 mr-2 animate-spin' />
        ) : null}
        Create & Edit
      </Button>
    </div>
  )
}
