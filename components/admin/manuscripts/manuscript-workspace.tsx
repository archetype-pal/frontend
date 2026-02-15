'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { Save, Trash2, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/admin/common/confirm-dialog'
import { CatalogueNumbersSection } from './catalogue-numbers-section'
import { DescriptionsSection } from './descriptions-section'
import { ItemPartsTab } from './item-parts-tab'
import {
  getHistoricalItem,
  updateHistoricalItem,
  deleteHistoricalItem,
} from '@/services/admin/manuscripts'
import { getFormats, getDates } from '@/services/admin/manuscripts'
import type { HistoricalItemDetail, ItemFormat, AdminDate } from '@/types/admin'

const ITEM_TYPES = ['charter', 'book', 'roll', 'single sheet', 'other']

interface ManuscriptWorkspaceProps {
  itemId: number
}

export function ManuscriptWorkspace({ itemId }: ManuscriptWorkspaceProps) {
  const { token } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: item, isLoading } = useQuery({
    queryKey: ['admin', 'historical-item', itemId],
    queryFn: () => getHistoricalItem(token!, itemId),
    enabled: !!token,
  })

  const { data: formats } = useQuery({
    queryKey: ['admin', 'formats'],
    queryFn: () => getFormats(token!),
    enabled: !!token,
  })

  const { data: dates } = useQuery({
    queryKey: ['admin', 'dates'],
    queryFn: () => getDates(token!),
    enabled: !!token,
  })

  const [draft, setDraft] = useState<Partial<HistoricalItemDetail>>({})
  const [dirty, setDirty] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (item) {
      setDraft({
        type: item.type,
        format: item.format,
        language: item.language,
        hair_type: item.hair_type,
        date: item.date,
      })
      setDirty(false)
    }
  }, [item])

  const updateField = <K extends keyof typeof draft>(
    field: K,
    value: (typeof draft)[K]
  ) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
    setDirty(true)
  }

  const saveMut = useMutation({
    mutationFn: () => updateHistoricalItem(token!, itemId, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'historical-item', itemId],
      })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'historical-items'],
      })
      setDirty(false)
    },
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteHistoricalItem(token!, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'historical-items'],
      })
      router.push('/admin/manuscripts')
    },
  })

  if (isLoading || !item) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    )
  }

  const heading =
    item.catalogue_numbers.length > 0
      ? item.catalogue_numbers.map((cn) => `${cn.catalogue_label} ${cn.number}`).join(', ')
      : `Historical Item #${item.id}`

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-start justify-between'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2'>
            <Link
              href='/admin/manuscripts'
              className='text-muted-foreground hover:text-foreground transition-colors'
            >
              <ArrowLeft className='h-4 w-4' />
            </Link>
            <h1 className='text-xl font-semibold'>{heading}</h1>
          </div>
          <div className='flex items-center gap-2'>
            <Badge variant='secondary'>{item.type}</Badge>
            {item.date_display && (
              <span className='text-sm text-muted-foreground'>
                {item.date_display}
              </span>
            )}
          </div>
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

      {/* Tabs */}
      <Tabs defaultValue='details'>
        <TabsList>
          <TabsTrigger value='details'>Details</TabsTrigger>
          <TabsTrigger value='parts'>
            Parts ({item.item_parts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value='details' className='space-y-6 mt-4'>
          {/* Basic fields */}
          <div className='grid grid-cols-2 lg:grid-cols-3 gap-4'>
            <div className='space-y-1.5'>
              <Label>Type</Label>
              <Select
                value={draft.type ?? ''}
                onValueChange={(val) => updateField('type', val)}
              >
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
              <Label>Format</Label>
              <Select
                value={String(draft.format ?? '__none')}
                onValueChange={(val) =>
                  updateField('format', val === '__none' ? null : Number(val))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none'>None</SelectItem>
                  {(formats ?? []).map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label>Date</Label>
              <Select
                value={String(draft.date ?? '__none')}
                onValueChange={(val) =>
                  updateField('date', val === '__none' ? null : Number(val))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none'>None</SelectItem>
                  {(dates ?? []).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label>Language</Label>
              <Input
                value={draft.language ?? ''}
                onChange={(e) => updateField('language', e.target.value)}
                placeholder='e.g. Latin'
              />
            </div>

            <div className='space-y-1.5'>
              <Label>Hair Type</Label>
              <Input
                value={draft.hair_type ?? ''}
                onChange={(e) => updateField('hair_type', e.target.value)}
                placeholder='e.g. HFHF'
              />
            </div>
          </div>

          {/* Catalogue Numbers */}
          <CatalogueNumbersSection
            historicalItemId={itemId}
            catalogueNumbers={item.catalogue_numbers}
          />

          {/* Descriptions */}
          <DescriptionsSection
            historicalItemId={itemId}
            descriptions={item.descriptions}
          />
        </TabsContent>

        <TabsContent value='parts' className='mt-4'>
          <ItemPartsTab
            historicalItemId={itemId}
            itemParts={item.item_parts}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title='Delete this historical item?'
        description='This will permanently delete this item and all its parts, images, and texts.'
        confirmLabel='Delete'
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  )
}
