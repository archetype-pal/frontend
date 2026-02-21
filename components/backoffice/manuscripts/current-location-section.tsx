'use client'

import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { MapPin, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldLabel } from '@/components/backoffice/common/help-tooltip'
import { CurrentItemCombobox } from './current-item-combobox'
import {
  createItemPart,
  updateItemPart,
  createCurrentItem,
  getCurrentItems,
  getRepositories,
} from '@/services/backoffice/manuscripts'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import { formatApiError } from '@/lib/backoffice/format-api-error'
import type { ItemPartNested, Repository } from '@/types/backoffice'

interface CurrentLocationSectionProps {
  historicalItemId: number
  itemParts: ItemPartNested[]
  onNavigateToParts?: () => void
}

export function CurrentLocationSection({
  historicalItemId,
  itemParts,
  onNavigateToParts,
}: CurrentLocationSectionProps) {
  if (itemParts.length === 0) {
    return (
      <SetupLocationPrompt historicalItemId={historicalItemId} />
    )
  }

  if (itemParts.length === 1) {
    return (
      <SinglePartLocation
        historicalItemId={historicalItemId}
        part={itemParts[0]}
      />
    )
  }

  return (
    <MultiPartSummary
      itemParts={itemParts}
      onNavigateToParts={onNavigateToParts}
    />
  )
}

// ── Case A: No parts yet ─────────────────────────────────────────────────

function SetupLocationPrompt({
  historicalItemId,
}: {
  historicalItemId: number
}) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [repository, setRepository] = useState('')
  const [shelfmark, setShelfmark] = useState('')
  const [locus, setLocus] = useState('')

  const { data: repositoriesData } = useQuery({
    queryKey: backofficeKeys.repositories.all(),
    queryFn: () => getRepositories(token!),
    enabled: !!token,
  })

  const repositories: Repository[] = repositoriesData?.results ?? repositoriesData ?? []

  const [saving, setSaving] = useState(false)

  const handleSetLocation = async () => {
    if (!token || !repository || !shelfmark.trim()) return
    setSaving(true)
    try {
      const existingItems = await getCurrentItems(token, {
        repository: Number(repository),
        limit: 500,
      })
      let currentItemId: number
      const match = existingItems.results.find(
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
      await createItemPart(token, {
        historical_item: historicalItemId,
        current_item: currentItemId,
        current_item_locus: locus.trim(),
      })
      toast.success('Location set')
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
      })
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.currentItems.all(),
      })
    } catch (err) {
      toast.error('Failed to set location', {
        description: formatApiError(err),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='space-y-3'>
      <h3 className='text-sm font-medium flex items-center gap-2'>
        <MapPin className='h-4 w-4' />
        Where is this manuscript held?
      </h3>
      <div className='rounded-lg border border-dashed p-4 space-y-3'>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          <div className='space-y-1.5'>
            <FieldLabel helpField='currentLocation.repository'>
              Repository
            </FieldLabel>
            <Select value={repository} onValueChange={setRepository}>
              <SelectTrigger className='h-9'>
                <SelectValue placeholder='Select repository...' />
              </SelectTrigger>
              <SelectContent>
                {repositories.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.label || r.name}
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
              className='h-9'
            />
          </div>
          <div className='space-y-1.5'>
            <FieldLabel helpField='itemPart.locus'>Locus</FieldLabel>
            <Input
              value={locus}
              onChange={(e) => setLocus(e.target.value)}
              placeholder='optional'
              className='h-9'
            />
          </div>
        </div>
        <Button
          size='sm'
          onClick={handleSetLocation}
          disabled={!repository || !shelfmark.trim() || saving}
        >
          {saving && <Loader2 className='h-3.5 w-3.5 mr-1 animate-spin' />}
          Set Location
        </Button>
        <p className='text-xs text-muted-foreground'>
          Links this manuscript to its physical location in a repository.
        </p>
      </div>
    </div>
  )
}

// ── Case B: Exactly 1 part ───────────────────────────────────────────────

function SinglePartLocation({
  historicalItemId,
  part,
}: {
  historicalItemId: number
  part: ItemPartNested
}) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [currentItemId, setCurrentItemId] = useState<number | null>(
    part.current_item
  )
  const [locus, setLocus] = useState(part.current_item_locus)
  const [customLabel, setCustomLabel] = useState(part.custom_label)
  const [dirty, setDirty] = useState(false)

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('No token')

      if (currentItemId !== part.current_item || locus !== part.current_item_locus || customLabel !== part.custom_label) {
        await updateItemPart(token, part.id, {
          current_item: currentItemId,
          current_item_locus: locus,
          custom_label: customLabel,
        })
      }
    },
    onSuccess: () => {
      toast.success('Location updated')
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
      })
      setDirty(false)
    },
    onError: (err) => {
      toast.error('Failed to update location', {
        description: formatApiError(err),
      })
    },
  })

  const handleCurrentItemChange = (id: number | null) => {
    setCurrentItemId(id)
    setDirty(true)
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-medium flex items-center gap-2'>
          <MapPin className='h-4 w-4' />
          Current Location
        </h3>
        {dirty && (
          <Button
            size='sm'
            className='h-7 text-xs'
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
          >
            {saveMut.isPending && (
              <Loader2 className='h-3 w-3 mr-1 animate-spin' />
            )}
            Save Location
          </Button>
        )}
      </div>
      <div className='rounded-md border p-4 space-y-3'>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          <div className='space-y-1.5 sm:col-span-2'>
            <FieldLabel helpField='itemPart.currentItem'>
              Physical volume
            </FieldLabel>
            <CurrentItemCombobox
              value={currentItemId}
              onChange={handleCurrentItemChange}
              selectedLabel={part.current_item_display}
              className='w-full'
            />
          </div>
          <div className='space-y-1.5'>
            <FieldLabel helpField='itemPart.locus'>Locus</FieldLabel>
            <Input
              value={locus}
              onChange={(e) => {
                setLocus(e.target.value)
                setDirty(true)
              }}
              placeholder='e.g. f.1r'
              className='h-9'
            />
          </div>
        </div>
        <div className='space-y-1.5'>
          <FieldLabel helpField='itemPart.customLabel'>
            Custom label
          </FieldLabel>
          <Input
            value={customLabel}
            onChange={(e) => {
              setCustomLabel(e.target.value)
              setDirty(true)
            }}
            placeholder='Optional override for display name'
            className='h-9'
          />
        </div>
      </div>
    </div>
  )
}

// ── Case C: Multiple parts ───────────────────────────────────────────────

function MultiPartSummary({
  itemParts,
  onNavigateToParts,
}: {
  itemParts: ItemPartNested[]
  onNavigateToParts?: () => void
}) {
  const volumeMap = new Map<string, number>()
  for (const part of itemParts) {
    const label = part.current_item_display ?? 'Unassigned'
    volumeMap.set(label, (volumeMap.get(label) ?? 0) + 1)
  }

  const volumeCount = new Set(
    itemParts.map((p) => p.current_item).filter(Boolean)
  ).size

  return (
    <div className='space-y-3'>
      <h3 className='text-sm font-medium flex items-center gap-2'>
        <MapPin className='h-4 w-4' />
        Current Location
      </h3>
      <div className='rounded-md border p-4 space-y-2'>
        <p className='text-sm text-muted-foreground'>
          This manuscript has {itemParts.length} parts across{' '}
          {volumeCount} volume{volumeCount !== 1 ? 's' : ''}:
        </p>
        <ul className='text-sm space-y-1'>
          {Array.from(volumeMap.entries()).map(([label, count]) => (
            <li key={label} className='flex items-center gap-2'>
              <span className='h-1.5 w-1.5 rounded-full bg-primary shrink-0' />
              <span>
                {label}{' '}
                <span className='text-muted-foreground'>
                  ({count} part{count !== 1 ? 's' : ''})
                </span>
              </span>
            </li>
          ))}
        </ul>
        {onNavigateToParts && (
          <Button
            variant='outline'
            size='sm'
            className='mt-2 h-7 text-xs gap-1'
            onClick={onNavigateToParts}
          >
            Manage Parts
            <ArrowRight className='h-3 w-3' />
          </Button>
        )}
      </div>
    </div>
  )
}
