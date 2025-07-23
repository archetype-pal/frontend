'use client'

import * as React from 'react'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowUp, ArrowDown } from 'lucide-react'
import type { ManuscriptListItem } from '@/types/manuscript'
import type { ImageListItem } from '@/types/image'
import type { ScribeListItem } from '@/types/scribe'
import type { HandListItem } from '@/types/hand'
import type { GraphListItem } from '@/types/graph'


export type Column<T> = {
    header: string
    sortKey?: string
    sortUrl?: string
    accessor: (item: T) => React.ReactNode
    className?: string
}

export const COLUMNS: Record<string, Column<any>[]> = {
    manuscripts: [
        { header: 'Repository City', accessor: (m: ManuscriptListItem) => m.repository_city, sortKey: 'repository_city_exact', },
        { header: 'Repository', accessor: (m: ManuscriptListItem) => m.repository_name, sortKey: 'repository_name_exact', },
        { header: 'Shelfmark', accessor: (m: ManuscriptListItem) => m.shelfmark, sortKey: 'shelfmark_exact', },
        { header: 'Catalogue Num.', accessor: (m: ManuscriptListItem) => m.catalogue_numbers, sortKey: 'catalogue_numbers_exact', },
        { header: 'Text Date', accessor: (m: ManuscriptListItem) => m.date },
        { header: 'Doc. Type', accessor: (m: ManuscriptListItem) => m.type, sortKey: 'type_exact', },
        {
            header: 'Images',
            accessor: (m: ManuscriptListItem) =>
                typeof m.number_of_images === 'number'
                    ? m.number_of_images.toLocaleString()
                    : '—',
            className: 'text-center',
            sortKey: 'number_of_images_exact'
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
        { header: 'Repository City', accessor: (i: ImageListItem) => i.repository_city, sortKey: 'repository_city_exact', },
        { header: 'Repository', accessor: (i: ImageListItem) => i.repository_name, sortKey: 'repository_name_exact', },
        { header: 'Shelfmark', accessor: (i: ImageListItem) => i.shelfmark, sortKey: 'shelfmark_exact', },
        { header: 'Category Number', accessor: () => '—' },
        { header: 'Doc. Type', accessor: (i: ImageListItem) => i.type, sortKey: 'type_exact', },
        { header: 'Image(thumbnail)', accessor: (i: ImageListItem) => <img src={i.thumbnail} alt={i.text} className='h-12 mx-auto' />, className: 'text-center' },
        { header: 'Number of annotations (Ann.)', accessor: (i: ImageListItem) => i.number_of_annotations, className: 'text-center', sortKey: 'number_of_annotations_exact', },
    ],
    scribes: [
        { header: 'Scribe Name', accessor: (s: ScribeListItem) => s.name, sortKey: 'name_exact', },
        { header: 'Date', accessor: (s: ScribeListItem) => s.period },
        { header: 'Scriptorium', accessor: (s: ScribeListItem) => s.scriptorium, sortKey: 'scriptorium_exact', },
    ],
    hands: [
        { header: 'Hand Title', accessor: (h: HandListItem) => h.name, sortKey: 'name_exact' },
        { header: 'Repository City', accessor: (h: HandListItem) => h.repository_city, sortKey: 'repository_city_exact', },
        { header: 'Repository', accessor: (h: HandListItem) => h.repository_name, sortKey: 'repository_name_exact', },
        { header: 'Shelfmark', accessor: (h: HandListItem) => h.shelfmark, sortKey: 'shelfmark_exact', },
        { header: 'Place', accessor: (h: HandListItem) => h.place, sortKey: 'place_exact', },
        { header: 'Date', accessor: (h: HandListItem) => h.date ?? '—' },
        { header: 'Catalogue Num.', accessor: (h: HandListItem) => h.catalogue_numbers, sortKey: 'catalogue_numbers_exact', },
    ],
    graphs: [
        { header: 'Repository City', accessor: (g: GraphListItem) => g.repository_city, sortKey: 'repository_city_exact', },
        { header: 'Repository', accessor: (g: GraphListItem) => g.repository_name, sortKey: 'repository_name_exact', },
        { header: 'Shelfmark', accessor: (g: GraphListItem) => g.shelfmark, sortKey: 'shelfmark_exact', },
        { header: 'Document Date', accessor: (g: GraphListItem) => g.date },
        { header: 'Allograph', accessor: (g: GraphListItem) => (g.is_annotated ? 'Yes' : 'No') },
        { header: 'Thumbnail', accessor: () => <span className='text-xs text-muted-foreground'>N/A</span>, className: 'text-center' },
    ],
}

export function ResultsTable({
    resultType,
    results,
    ordering,
    onSort,
}: {
    resultType: string
    results: any[]
    ordering?: {
        current: string
        options: Array<{ name: string; text: string; url: string }>
    }
    onSort?: (opts: { sortKey?: string; sortUrl?: string }) => void
}) {
    const baseCols = COLUMNS[resultType] ?? []

    const cols = ordering?.options
        ? baseCols.map(col => {
            if (!col.sortKey) return col

            const asc = ordering.options.find(o => o.name === col.sortKey)
            const desc = ordering.options.find(o => o.name === `-${col.sortKey}`)

            const next =
                ordering.current === col.sortKey
                    ? desc || asc
                    : asc || desc
            return next
                ? { ...col, sortUrl: next.url }
                : col
        })
        : baseCols

    const currentKey = ordering?.current.replace(/^-/, '')
    const isDesc = ordering?.current.startsWith('-')

    return (
        <div className='bg-white border rounded-lg overflow-auto'>
            <Table>
                <TableHeader>
                    <TableRow>
                        {cols.map((col, i) => (
                            <TableHead
                                key={i}
                                className={col.className}
                                style={{ cursor: col.sortKey || col.sortUrl ? 'pointer' : undefined }}
                                onClick={() => {
                                    onSort?.({ sortKey: col.sortKey, sortUrl: col.sortUrl })
                                }}
                            >
                                <div className="inline-flex items-center space-x-1">
                                    <span>{col.header}</span>
                                    {col.sortKey === currentKey && (
                                        isDesc
                                            ? <ArrowDown className="w-4 h-4 text-muted-foreground" />
                                            : <ArrowUp className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </div>
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
