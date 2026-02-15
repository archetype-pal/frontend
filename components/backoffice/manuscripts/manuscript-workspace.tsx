'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, Trash2, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
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
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog'
import { FieldLabel } from '@/components/backoffice/common/help-tooltip'
import { CompletenessChecklist } from '@/components/backoffice/common/completeness-checklist'
import { UnsavedChangesBar } from '@/components/backoffice/common/unsaved-changes-bar'
import { CatalogueNumbersSection } from './catalogue-numbers-section'
import { DescriptionsSection } from './descriptions-section'
import { ItemPartsTab } from './item-parts-tab'
import {
  getHistoricalItem,
  updateHistoricalItem,
  deleteHistoricalItem,
} from '@/services/backoffice/manuscripts'
import { getFormats, getDates } from '@/services/backoffice/manuscripts'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import { formatApiError } from '@/lib/backoffice/format-api-error'
import { useUnsavedGuard } from '@/hooks/backoffice/use-unsaved-guard'
import { useKeyboardShortcut } from '@/hooks/backoffice/use-keyboard-shortcut'
import { useRecentEntities } from '@/hooks/backoffice/use-recent-entities'
import type { HistoricalItemDetail, ItemFormat, BackofficeDate } from '@/types/backoffice'

const ITEM_TYPES = ['charter', 'book', 'roll', 'single sheet', 'other']

interface ManuscriptWorkspaceProps {
  itemId: number
}

export function ManuscriptWorkspace({ itemId }: ManuscriptWorkspaceProps) {
  const { token } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: item, isLoading } = useQuery({
    queryKey: backofficeKeys.manuscripts.detail(itemId),
    queryFn: () => getHistoricalItem(token!, itemId),
    enabled: !!token,
  })

  const { data: formats } = useQuery({
    queryKey: backofficeKeys.formats.all(),
    queryFn: () => getFormats(token!),
    enabled: !!token,
  })

  const { data: dates } = useQuery({
    queryKey: backofficeKeys.dates.all(),
    queryFn: () => getDates(token!),
    enabled: !!token,
  })

  const { track } = useRecentEntities()

  const [draft, setDraft] = useState<Partial<HistoricalItemDetail>>({})
  const [dirty, setDirty] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (item) {
      const label = item.catalogue_numbers.length > 0
        ? item.catalogue_numbers.map((cn) => `${cn.catalogue_label} ${cn.number}`).join(', ')
        : `Item #${item.id}`
      track({ label, href: `/backoffice/manuscripts/${itemId}`, type: 'Manuscript' })
      setDraft({
        type: item.type,
        format: item.format,
        language: item.language,
        hair_type: item.hair_type,
        date: item.date,
      })
      setDirty(false)
    }
  }, [item, itemId, track])

  const updateField = <K extends keyof typeof draft>(
    field: K,
    value: (typeof draft)[K]
  ) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
    setDirty(true)
  }

  // Warn before leaving with unsaved changes
  useUnsavedGuard(dirty)

  const saveMut = useMutation({
    mutationFn: () => updateHistoricalItem(token!, itemId, draft),
    onSuccess: () => {
      toast.success('Manuscript saved')
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.manuscripts.detail(itemId),
      })
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.manuscripts.all(),
      })
      setDirty(false)
    },
    onError: (err) => {
      toast.error('Failed to save manuscript', {
        description: formatApiError(err),
      })
    },
  })

  // Cmd+S to save
  useKeyboardShortcut('mod+s', () => {
    if (dirty && !saveMut.isPending) saveMut.mutate()
  }, dirty)

  const deleteMut = useMutation({
    mutationFn: () => deleteHistoricalItem(token!, itemId),
    onSuccess: () => {
      toast.success('Manuscript deleted')
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.manuscripts.all(),
      })
      router.push('/backoffice/manuscripts')
    },
    onError: (err) => {
      toast.error('Failed to delete manuscript', {
        description: formatApiError(err),
      })
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
              href='/backoffice/manuscripts'
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

      {/* Relationship summary bar */}
      {(() => {
        const partsCount = item.item_parts.length
        const imagesCount = item.item_parts.reduce(
          (sum, p) => sum + (p.images?.length ?? 0),
          0
        )
        const catalogueCount = item.catalogue_numbers.length
        const descriptionsCount = item.descriptions.length
        const badges = [
          ['Parts', partsCount],
          ['Images', imagesCount],
          ['Catalogue Numbers', catalogueCount],
          ['Descriptions', descriptionsCount],
        ] as const
        return (
          <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
            {badges.map(([label, count]) => (
              <Badge
                key={label}
                variant='secondary'
                className='font-normal text-muted-foreground'
              >
                {label} ({count})
              </Badge>
            ))}
          </div>
        )
      })()}

      {/* Completeness checklist */}
      <CompletenessChecklist
        items={[
          {
            label: 'Date',
            complete: item.date != null,
            value: item.date_display ?? undefined,
          },
          {
            label: 'Format',
            complete: item.format != null,
            value: item.format_display ?? undefined,
          },
          {
            label: 'Language',
            complete: !!item.language,
          },
          {
            label: 'Catalogue Numbers',
            complete: item.catalogue_numbers.length > 0,
            value:
              item.catalogue_numbers.length > 0
                ? `${item.catalogue_numbers.length} entries`
                : undefined,
          },
          {
            label: 'Descriptions',
            complete: item.descriptions.length > 0,
            value:
              item.descriptions.length > 0
                ? `${item.descriptions.length} entries`
                : undefined,
          },
          {
            label: 'Item Parts',
            complete: item.item_parts.length > 0,
            value:
              item.item_parts.length > 0
                ? `${item.item_parts.length} parts`
                : undefined,
          },
        ]}
      />

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
              <FieldLabel helpField='manuscript.type'>Type</FieldLabel>
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
              <FieldLabel helpField='manuscript.format'>Format</FieldLabel>
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
              <FieldLabel helpField='manuscript.date'>Date</FieldLabel>
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
              <FieldLabel helpField='manuscript.language'>Language</FieldLabel>
              <Input
                value={draft.language ?? ''}
                onChange={(e) => updateField('language', e.target.value)}
                placeholder='e.g. Latin'
              />
            </div>

            <div className='space-y-1.5'>
              <FieldLabel helpField='manuscript.hair_type'>Hair Type</FieldLabel>
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

      <UnsavedChangesBar
        visible={dirty}
        onSave={() => saveMut.mutate()}
        onDiscard={() => {
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
        }}
        saving={saveMut.isPending}
      />
    </div>
  )
}
