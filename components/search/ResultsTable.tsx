'use client'

import * as React from 'react'
import {
  Table, TableHeader, TableBody, TableRow, TableCell, TableHead,
} from '@/components/ui/table'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowUp, ArrowDown } from 'lucide-react'
import type { ResultType } from './search-result-types'
import type { ManuscriptListItem } from '@/types/manuscript'
import type { ImageListItem } from '@/types/image'
import type { ScribeListItem } from '@/types/scribe'
import type { HandListItem } from '@/types/hand'
import type { GraphListItem } from '@/types/graph'
import { Highlight } from './Highlight'
import { CollectionStar } from '@/components/collection-star'

export type Column<T> = {
  header: string
  sortKey?: string
  sortUrl?: string
  accessor: (item: T) => React.ReactNode
  className?: string
}

type ResultMap = {
  manuscripts: ManuscriptListItem
  images: ImageListItem
  scribes: ScribeListItem
  hands: HandListItem
  graphs: GraphListItem
}

export const COLUMNS: { [K in ResultType]: Column<ResultMap[K]>[] } = {
  manuscripts: [
    { header: 'Repository City', accessor: (m) => m.repository_city, sortKey: 'repository_city_exact' },
    { header: 'Repository', accessor: (m) => m.repository_name, sortKey: 'repository_name_exact' },
    { header: 'Shelfmark', accessor: (m) => m.shelfmark, sortKey: 'shelfmark_exact' },
    { header: 'Catalogue Num.', accessor: (m) => m.catalogue_numbers, sortKey: 'catalogue_numbers_exact' },
    { header: 'Text Date', accessor: (m) => m.date },
    { header: 'Doc. Type', accessor: (m) => m.type, sortKey: 'type_exact' },
    {
      header: 'Images',
      accessor: (m) =>
        typeof m.number_of_images === 'number'
          ? m.number_of_images.toLocaleString()
          : '—',
      className: 'text-center',
      sortKey: 'number_of_images_exact',
    },
  ],

  images: [
    { header: 'Repository City', accessor: (i) => i.repository_city, sortKey: 'repository_city_exact' },
    { header: 'Repository', accessor: (i) => i.repository_name, sortKey: 'repository_name_exact' },
    { header: 'Shelfmark', accessor: (i) => i.shelfmark, sortKey: 'shelfmark_exact' },
    { header: 'Category Number', accessor: () => '—' },
    { header: 'Doc. Type', accessor: (i) => i.type, sortKey: 'type_exact' },
    {
      header: 'Thumbnail',
      accessor: (i) => {
        const src = (i.thumbnail || '').trim()

        if (!src) {
          return <span className="text-xs text-muted-foreground">N/A</span>
        }

        return (
          <div className="relative inline-block group w-20 h-20 flex items-center justify-center bg-gray-50 rounded border border-gray-200 overflow-hidden">
            <Image
              src={src}
              alt={i.shelfmark || 'Image thumbnail'}
              width={64}
              height={64}
              className="h-full w-auto object-contain"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 pointer-events-none z-10" />
            <CollectionStar
              itemId={i.id}
              itemType="image"
              item={i}
              size={16}
            />
          </div>
        )
      },
      className: 'text-center',
    },
    {
      header: 'Ann.',
      accessor: (i) => i.number_of_annotations,
      className: 'text-center',
      sortKey: 'number_of_annotations_exact',
    },
  ],

  scribes: [
    { header: 'Scribe Name', accessor: (s) => s.name, sortKey: 'name_exact' },
    { header: 'Date', accessor: (s) => s.period },
    { header: 'Scriptorium', accessor: (s) => s.scriptorium, sortKey: 'scriptorium_exact' },
  ],

  hands: [
    { header: 'Hand Title', accessor: (h) => h.name, sortKey: 'name_exact' },
    { header: 'Repository City', accessor: (h) => h.repository_city, sortKey: 'repository_city_exact' },
    { header: 'Repository', accessor: (h) => h.repository_name, sortKey: 'repository_name_exact' },
    { header: 'Shelfmark', accessor: (h) => h.shelfmark, sortKey: 'shelfmark_exact' },
    { header: 'Place', accessor: (h) => h.place, sortKey: 'place_exact' },
    { header: 'Date', accessor: (h) => h.date ?? '—' },
    { header: 'Catalogue Num.', accessor: (h) => h.catalogue_numbers, sortKey: 'catalogue_numbers_exact' },
  ],

  graphs: [
    { header: 'Repository City', accessor: (g) => g.repository_city, sortKey: 'repository_city_exact' },
    { header: 'Repository', accessor: (g) => g.repository_name, sortKey: 'repository_name_exact' },
    { header: 'Shelfmark', accessor: (g) => g.shelfmark, sortKey: 'shelfmark_exact' },
    { header: 'Document Date', accessor: (g) => g.date },
    { header: 'Allograph', accessor: (g) => (g.is_annotated ? 'Yes' : 'No') },
    {
      header: 'Thumbnail',
      accessor: (g) => g.image_url ? (
        <div className="relative inline-block group w-20 h-20 flex items-center justify-center bg-gray-50 rounded border border-gray-200 overflow-hidden">
          <img 
            src={g.image_url} 
            alt={`Thumbnail for ${g.shelfmark}`}
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 pointer-events-none z-10" />
          <CollectionStar
            itemId={g.id}
            itemType="graph"
            item={g}
            size={16}
          />
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">N/A</span>
      ),
      className: 'text-center',
    },
  ],
}

function getDetailUrl<K extends ResultType>(resultType: K, item: ResultMap[K]): string {
  switch (resultType) {
    case 'manuscripts':
      return `/manuscripts/${(item as ManuscriptListItem).id}`
    case 'images':
      return `/digipal/${(item as ImageListItem).id}`
    case 'scribes':
    case 'hands':
    case 'graphs':
      return `/${resultType}/${(item as ScribeListItem | HandListItem | GraphListItem).id}`
    default:
      return '#'
  }
}

export function ResultsTable<K extends ResultType>({
  resultType,
  results,
  ordering,
  onSort,
  highlightKeyword = '',
}: {
  resultType: K
  results: ResultMap[K][]
  ordering?: {
    current: string
    options: Array<{ name: string; text: string; url: string }>
  }
  onSort?: (opts: { sortKey?: string; sortUrl?: string }) => void
  highlightKeyword?: string
}) {
  const router = useRouter()
  const baseCols = COLUMNS[resultType]
  const cols = ordering?.options
    ? baseCols.map((col) => {
      if (!col.sortKey) return col
      const asc = ordering.options.find((o) => o.name === col.sortKey)
      const desc = ordering.options.find((o) => o.name === `-${col.sortKey}`)
      const next = ordering.current === col.sortKey ? (desc || asc) : (asc || desc)
      return next ? { ...col, sortUrl: next.url } : col
    })
    : baseCols

  const currKey = ordering?.current?.replace(/^-/, '')
  const isDesc = ordering?.current?.startsWith('-') ?? false

  const handleRowClick = (item: ResultMap[K], e: React.MouseEvent<HTMLTableRowElement>) => {
    // Don't navigate if clicking on a link or button
    const target = e.target as HTMLElement
    if (target.closest('a, button')) {
      return
    }
    const url = getDetailUrl(resultType, item)
    router.push(url)
  }

  return (
    <div className="bg-white border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {cols.map((col, i) => (
              <TableHead
                key={i}
                className={col.className}
                style={{ cursor: col.sortKey || col.sortUrl ? 'pointer' : undefined }}
                onClick={() => onSort?.({ sortKey: col.sortKey, sortUrl: col.sortUrl })}
              >
                <div className="inline-flex items-center space-x-1">
                  <span>{col.header}</span>
                  {col.sortKey === currKey &&
                    (isDesc
                      ? <ArrowDown className="w-4 h-4 text-muted-foreground" />
                      : <ArrowUp className="w-4 h-4 text-muted-foreground" />)}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((row, ri) => (
            <TableRow 
              key={ri}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={(e) => handleRowClick(row, e)}
            >
              {cols.map((col, ci) => {
                const cell = col.accessor(row)
                if (
                  highlightKeyword &&
                  (typeof cell === 'string' || typeof cell === 'number')
                ) {
                  return (
                    <TableCell key={ci} className={col.className}>
                      <Highlight text={String(cell)} keyword={highlightKeyword} />
                    </TableCell>
                  )
                }
                return (
                  <TableCell key={ci} className={col.className}>
                    {cell}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
