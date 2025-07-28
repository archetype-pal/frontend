'use client'

import * as React from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { ManuscriptListItem } from '@/types/manuscript'
import type { ImageListItem } from '@/types/image'
import type { ScribeListItem } from '@/types/scribe'
import type { HandListItem } from '@/types/hand'
import type { GraphListItem } from '@/types/graph'


export type Column<T> = {
  header: string
  accessor: (item: T) => React.ReactNode
  className?: string
}

export const COLUMNS: Record<string, Column<any>[]> = {
  manuscripts: [
    { header: 'Repository City', accessor: (m: ManuscriptListItem) => m.repository_city },
    { header: 'Repository',      accessor: (m: ManuscriptListItem) => m.repository_name },
    { header: 'Shelfmark',        accessor: (m: ManuscriptListItem) => m.shelfmark },
    { header: 'Catalogue Num.',   accessor: (m: ManuscriptListItem) => m.catalogue_numbers },
    { header: 'Text Date',        accessor: (m: ManuscriptListItem) => m.date },
    { header: 'Doc. Type',        accessor: (m: ManuscriptListItem) => m.type },
    {
      header: 'Images',
      accessor: (m: ManuscriptListItem) =>
        typeof m.number_of_images === 'number'
          ? m.number_of_images.toLocaleString()
          : '—',
      className: 'text-center',
    },
    {
      header: 'View',
      accessor: (m: ManuscriptListItem) => (
        <Link href={`/manuscripts/${m.id}`}>  
          <Button variant="outline" size="sm">View</Button>
        </Link>
      ),
      className: 'w-[80px]',
    },
  ],
  images: [
    { header: 'Repository City',    accessor: (i: ImageListItem) => i.repository_city },
    { header: 'Repository',         accessor: (i: ImageListItem) => i.repository_name },
    { header: 'Shelfmark',          accessor: (i: ImageListItem) => i.shelfmark },
    { header: 'Category Number',    accessor: () => '—' },
    { header: 'Doc. Type',          accessor: (i: ImageListItem) => i.type },
    { header: 'Image(thumbnail)',   accessor: (i: ImageListItem) => <img src={i.thumbnail} alt={i.text} className='h-12 mx-auto' />, className: 'text-center' },
    { header: 'Number of annotations (Ann.)', accessor: (i: ImageListItem) => i.number_of_annotations, className: 'text-center' },
  ],
  scribes: [
    { header: 'Scribe Name', accessor: (s: ScribeListItem) => s.name },
    { header: 'Date',        accessor: (s: ScribeListItem) => s.period },
    { header: 'Scriptorium', accessor: (s: ScribeListItem) => s.scriptorium },
  ],
  hands: [
    { header: 'Hand Title',      accessor: (h: HandListItem) => h.name },
    { header: 'Repository City', accessor: (h: HandListItem) => h.repository_city },
    { header: 'Repository',      accessor: (h: HandListItem) => h.repository_name },
    { header: 'Shelfmark',       accessor: (h: HandListItem) => h.shelfmark },
    { header: 'Place',           accessor: (h: HandListItem) => h.place },
    { header: 'Date',            accessor: (h: HandListItem) => h.date ?? '—' },
    { header: 'Cat. Num.',       accessor: (h: HandListItem) => h.catalogue_numbers },
  ],
  graphs: [
    { header: 'Repository City', accessor: (g: GraphListItem) => g.repository_city },
    { header: 'Repository',      accessor: (g: GraphListItem) => g.repository_name },
    { header: 'Shelfmark',       accessor: (g: GraphListItem) => g.shelfmark },
    { header: 'Document Date',   accessor: (g: GraphListItem) => g.date },
    { header: 'Allograph',       accessor: (g: GraphListItem) => (g.is_annotated ? 'Yes' : 'No') },
    { header: 'Thumbnail',       accessor: () => <span className='text-xs text-muted-foreground'>N/A</span>, className: 'text-center' },
  ],
}

export function ResultsTable({
  resultType,
  results,
}: {
  resultType: string
  results: any[]
}) {
  const cols = COLUMNS[resultType] ?? []
  return (
    <div className='bg-white border rounded-lg overflow-auto'>
      <Table>
        <TableHeader>
          <TableRow>
            {cols.map((col, i) => (
              <TableHead key={i} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((row, i) => (
            <TableRow key={i}>
              {cols.map((col, j) => (
                <TableCell key={j} className={col.className}>
                  {col.accessor(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
