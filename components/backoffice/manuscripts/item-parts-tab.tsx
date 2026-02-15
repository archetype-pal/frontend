'use client'

import { useState } from 'react'
import {
  ChevronDown,
  Image as ImageIcon,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { ItemPartNested } from '@/types/backoffice'

interface ItemPartsTabProps {
  historicalItemId: number
  itemParts: ItemPartNested[]
}

export function ItemPartsTab({
  historicalItemId,
  itemParts,
}: ItemPartsTabProps) {
  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-medium'>
          Item Parts ({itemParts.length})
        </h3>
      </div>

      {itemParts.length === 0 ? (
        <div className='rounded-lg border border-dashed p-8 text-center text-muted-foreground'>
          <p className='text-sm'>No item parts yet.</p>
        </div>
      ) : (
        <div className='space-y-2'>
          {itemParts.map((part) => (
            <ItemPartCard key={part.id} part={part} />
          ))}
        </div>
      )}
    </div>
  )
}

function ItemPartCard({ part }: { part: ItemPartNested }) {
  return (
    <Collapsible className='rounded-md border'>
      <CollapsibleTrigger className='flex w-full items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors'>
        <ChevronDown className='h-4 w-4 shrink-0 transition-transform [[data-state=closed]>&]:rotate-[-90deg]' />
        <div className='flex-1 text-left'>
          <p className='text-sm font-medium'>{part.display_label}</p>
          {part.current_item_display && (
            <p className='text-xs text-muted-foreground'>
              {part.current_item_display}
              {part.current_item_locus ? `, ${part.current_item_locus}` : ''}
            </p>
          )}
        </div>
        <div className='flex items-center gap-2'>
          <Badge variant='secondary' className='text-xs gap-1'>
            <ImageIcon className='h-3 w-3' />
            {part.images.length}
          </Badge>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className='border-t px-4 py-3'>
          {part.images.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No images</p>
          ) : (
            <div className='grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2'>
              {part.images.map((img) => (
                <div
                  key={img.id}
                  className='group relative aspect-square rounded-md border bg-muted overflow-hidden'
                >
                  {img.image ? (
                    <div className='flex items-center justify-center h-full text-xs text-muted-foreground'>
                      <ImageIcon className='h-6 w-6' />
                    </div>
                  ) : (
                    <div className='flex items-center justify-center h-full text-xs text-muted-foreground'>
                      No img
                    </div>
                  )}
                  <div className='absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5'>
                    <p className='text-[9px] text-white truncate'>
                      {img.locus || '—'}
                    </p>
                  </div>
                  {img.text_count > 0 && (
                    <Badge className='absolute top-0.5 right-0.5 h-4 px-1 text-[9px]'>
                      {img.text_count}T
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
