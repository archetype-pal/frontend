'use client'

import * as React from 'react'
import {
  Table, TableHeader, TableBody, TableRow, TableCell, TableHead,
} from '@/components/ui/table'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUp, ArrowDown } from 'lucide-react'
import type { ResultType } from './search-result-types'
import type { ManuscriptListItem } from '@/types/manuscript'
import type { ImageListItem } from '@/types/image'
import type { ScribeListItem } from '@/types/scribe'
import type { HandListItem } from '@/types/hand'
import type { GraphListItem } from '@/types/graph'
import type { TextListItem } from '@/types/text'
import type { ClauseListItem } from '@/types/clause'
import type { PersonListItem } from '@/types/person'
import type { PlaceListItem } from '@/types/place'
import { getIiifImageUrl } from '@/utils/iiif'
import { useIiifThumbnailUrl } from '@/hooks/use-iiif-thumbnail'
import { Highlight } from './Highlight'
import { CollectionStar } from '@/components/collection/collection-star'

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
  texts: TextListItem
  clauses: ClauseListItem
  people: PersonListItem
  places: PlaceListItem
}

function GraphThumbnailCell({ graph }: { graph: GraphListItem }) {
  const infoUrl = (graph.image_iiif || '').trim()
  const src = useIiifThumbnailUrl(infoUrl, graph.coordinates)

  if (!infoUrl) return <span className="text-xs text-muted-foreground">N/A</span>
  if (!src) {
    return (
      <div className="relative inline-block w-20 h-20 flex items-center justify-center bg-gray-50 rounded border border-gray-200 overflow-hidden">
        <span className="text-xs text-muted-foreground">…</span>
      </div>
    )
  }
  return (
    <div className="relative z-[2] inline-block group w-20 h-20 flex items-center justify-center bg-gray-50 rounded border border-gray-200 overflow-hidden">
      <Image
        src={src}
        alt={`Thumbnail for ${graph.shelfmark}`}
        width={80}
        height={80}
        className="w-full h-full object-contain"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 pointer-events-none z-10" />
      <CollectionStar itemId={graph.id} itemType="graph" item={graph} size={16} />
    </div>
  )
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
        const infoUrl = (i.image_iiif || '').trim()
        const src = infoUrl ? getIiifImageUrl(infoUrl, { thumbnail: true }) : ''

        if (!src) {
          return <span className="text-xs text-muted-foreground">N/A</span>
        }

        return (
          <div className="relative z-[2] inline-block group w-20 h-20 flex items-center justify-center bg-gray-50 rounded border border-gray-200 overflow-hidden">
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
      accessor: (g) => <GraphThumbnailCell graph={g} />,
      className: 'text-center',
    },
  ],

  texts: [
    { header: 'Repository City', accessor: (t) => t.repository_city, sortKey: 'repository_city_exact' },
    { header: 'Repository', accessor: (t) => t.repository_name, sortKey: 'repository_name_exact' },
    { header: 'Shelfmark', accessor: (t) => t.shelfmark, sortKey: 'shelfmark_exact' },
    { header: 'Text Type', accessor: (t) => t.text_type, sortKey: 'text_type_exact' },
    { header: 'MS Date', accessor: (t) => t.date ?? '—' },
    {
      header: 'Thumbnail',
      accessor: (t) => {
        const infoUrl = (t.thumbnail_iiif || '').trim()
        const src = infoUrl ? getIiifImageUrl(infoUrl, { thumbnail: true }) : ''

        if (!src) {
          return <span className="text-xs text-muted-foreground">N/A</span>
        }

        return (
          <div className="relative inline-block group w-20 h-20 flex items-center justify-center bg-gray-50 rounded border border-gray-200 overflow-hidden">
            <Image
              src={src}
              alt={t.shelfmark || 'Text thumbnail'}
              width={64}
              height={64}
              className="h-full w-auto object-contain"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 pointer-events-none z-10" />
          </div>
        )
      },
      className: 'text-center',
    },
  ],

  clauses: [
    { header: 'Cat. Num.', accessor: (c) => c.catalogue_numbers },
    { header: 'Document Type', accessor: (c) => c.type, sortKey: 'type_exact' },
    { header: 'Repository City', accessor: (c) => c.repository_city, sortKey: 'repository_city_exact' },
    { header: 'Repository', accessor: (c) => c.repository_name, sortKey: 'repository_name_exact' },
    { header: 'Shelfmark', accessor: (c) => c.shelfmark, sortKey: 'shelfmark_exact' },
    { header: 'Text Date', accessor: (c) => c.date ?? '—' },
    { header: 'Text Type', accessor: (c) => c.text_type },
    { header: 'Clause Type', accessor: (c) => c.clause_type, sortKey: 'clause_type_exact' },
  ],

  people: [
    { header: 'Cat. Num.', accessor: (p) => p.catalogue_numbers },
    { header: 'Document Type', accessor: (p) => p.type, sortKey: 'type_exact' },
    { header: 'Repository City', accessor: (p) => p.repository_city, sortKey: 'repository_city_exact' },
    { header: 'Repository', accessor: (p) => p.repository_name, sortKey: 'repository_name_exact' },
    { header: 'Shelfmark', accessor: (p) => p.shelfmark, sortKey: 'shelfmark_exact' },
    { header: 'Text Date', accessor: (p) => p.date ?? '—' },
    { header: 'Text Type', accessor: (p) => p.text_type },
    { header: 'Category', accessor: (p) => p.person_type, sortKey: 'person_type_exact' },
  ],

  places: [
    { header: 'Cat. Num.', accessor: (p) => p.catalogue_numbers },
    { header: 'Document Type', accessor: (p) => p.type, sortKey: 'type_exact' },
    { header: 'Repository City', accessor: (p) => p.repository_city, sortKey: 'repository_city_exact' },
    { header: 'Repository', accessor: (p) => p.repository_name, sortKey: 'repository_name_exact' },
    { header: 'Shelfmark', accessor: (p) => p.shelfmark, sortKey: 'shelfmark_exact' },
    { header: 'Text Date', accessor: (p) => p.date ?? '—' },
    { header: 'Text Type', accessor: (p) => p.text_type },
    { header: 'Clause Type', accessor: (p) => p.place_type, sortKey: 'place_type_exact' },
  ],
}

/* ---------- sub-row accessors (legacy two-row pattern) ---------- */

type SubRowAccessor<T> = (item: T) => string

const SUB_ROW_ACCESSORS: Partial<{ [K in ResultType]: SubRowAccessor<ResultMap[K]> }> = {
  clauses: (c) => (c as ClauseListItem).content,
  people: (p) => (p as PersonListItem).name,
  places: (p) => (p as PlaceListItem).name,
}

function imageDetailUrl(item: { item_part?: number | null; item_image?: number | null }): string {
  if (item.item_part && item.item_image) {
    return `/manuscripts/${item.item_part}/images/${item.item_image}`
  }
  return '#'
}

function getDetailUrl<K extends ResultType>(resultType: K, item: ResultMap[K]): string {
  switch (resultType) {
    case 'manuscripts':
      return `/manuscripts/${(item as ManuscriptListItem).id}`
    case 'images':
      return `/digipal/${(item as ImageListItem).id}`
    case 'texts':
      return imageDetailUrl(item as TextListItem)
    case 'clauses':
      return imageDetailUrl(item as ClauseListItem)
    case 'people':
      return imageDetailUrl(item as PersonListItem)
    case 'places':
      return imageDetailUrl(item as PlaceListItem)
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
  visibleColumns,
}: {
  resultType: K
  results: ResultMap[K][]
  ordering?: {
    current: string
    options: Array<{ name: string; text: string; url: string }>
  }
  onSort?: (opts: { sortKey?: string; sortUrl?: string }) => void
  highlightKeyword?: string
  visibleColumns?: string[]
}) {
  const allCols = COLUMNS[resultType]
  const baseCols = visibleColumns
    ? visibleColumns
        .map((h) => allCols.find((c) => c.header === h))
        .filter((c): c is NonNullable<typeof c> => c != null)
    : allCols
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

  const subRowAccessor = SUB_ROW_ACCESSORS[resultType] as SubRowAccessor<ResultMap[K]> | undefined
  const hasSubRow = !!subRowAccessor
  // +1 for the View column when sub-rows are present
  const totalColSpan = cols.length + (hasSubRow ? 1 : 0)

  return (
    <div className="bg-white border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {hasSubRow && (
              <TableHead className="w-16" />
            )}
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
        {results.map((row, ri) => {
          const url = getDetailUrl(resultType, row)
          return (
            <tbody key={ri} className="group border-b">
              {/* Main data row */}
              <TableRow
                className={`relative cursor-pointer group-hover:bg-muted/50 transition-colors${hasSubRow ? ' border-b-0' : ''}`}
              >
                {hasSubRow && (
                  <TableCell className="w-16 py-1.5">
                    <Link
                      href={url}
                      className="absolute inset-0 z-[1]"
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    <Link
                      href={url}
                      className="relative z-[2] inline-block text-xs text-primary border border-primary/30 rounded px-2 py-0.5 hover:bg-primary/5 transition-colors whitespace-nowrap"
                    >
                      View
                    </Link>
                  </TableCell>
                )}
                {cols.map((col, ci) => {
                  const cell = col.accessor(row)
                  const isFirst = ci === 0 && !hasSubRow
                  const inner =
                    highlightKeyword &&
                    (typeof cell === 'string' || typeof cell === 'number')
                      ? <Highlight text={String(cell)} keyword={highlightKeyword} />
                      : cell

                  return (
                    <TableCell key={ci} className={col.className}>
                      {isFirst ? (
                        <Link
                          href={url}
                          className="after:content-[''] after:absolute after:inset-0 after:z-[1]"
                        >
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
              {/* Sub-row: name/content displayed in italic spanning full width */}
              {subRowAccessor && (
                <TableRow
                  className="relative cursor-pointer group-hover:bg-muted/50 transition-colors"
                >
                  <TableCell
                    colSpan={totalColSpan}
                    className="py-1.5 pl-20 text-sm italic text-muted-foreground"
                  >
                    <Link
                      href={url}
                      className="after:content-[''] after:absolute after:inset-0 after:z-[1]"
                    >
                      {highlightKeyword ? (
                        <Highlight text={subRowAccessor(row)} keyword={highlightKeyword} />
                      ) : (
                        subRowAccessor(row)
                      )}
                    </Link>
                  </TableCell>
                </TableRow>
              )}
            </tbody>
          )
        })}
      </Table>
    </div>
  )
}
