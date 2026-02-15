'use client'

import { useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  /** Key of the column used for the global search input. */
  searchColumn?: string
  searchPlaceholder?: string
  /** Actions rendered in the toolbar (e.g. a "New" button). */
  toolbarActions?: React.ReactNode
  /** Enable client-side pagination (default: true). */
  pagination?: boolean
  pageSize?: number
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = 'Search...',
  toolbarActions,
  pagination = true,
  pageSize = 20,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(pagination && { getPaginationRowModel: getPaginationRowModel() }),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnFilters, columnVisibility },
    initialState: { pagination: { pageSize } },
  })

  return (
    <div className='space-y-3'>
      {/* Toolbar */}
      {(searchColumn || toolbarActions) && (
        <div className='flex items-center gap-2'>
          {searchColumn && (
            <div className='relative max-w-sm flex-1'>
              <Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder={searchPlaceholder}
                value={
                  (table
                    .getColumn(searchColumn)
                    ?.getFilterValue() as string) ?? ''
                }
                onChange={(e) =>
                  table
                    .getColumn(searchColumn)
                    ?.setFilterValue(e.target.value)
                }
                className='pl-8 h-9'
              />
            </div>
          )}
          <div className='ml-auto flex items-center gap-2'>
            {toolbarActions}
          </div>
        </div>
      )}

      {/* Table */}
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center text-muted-foreground'
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className='flex items-center justify-between text-sm text-muted-foreground'>
          <span>
            {table.getFilteredRowModel().rows.length} row(s) total
          </span>
          <div className='flex items-center gap-1'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className='h-8 w-8 p-0'
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <span className='px-2 tabular-nums'>
              {table.getState().pagination.pageIndex + 1} /{' '}
              {table.getPageCount()}
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className='h-8 w-8 p-0'
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Helper: creates a sortable header for a column.
 * Usage: `header: sortableHeader('Name')`
 */
export function sortableHeader(label: string) {
  return function SortableHeader({
    column,
  }: {
    column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' }
  }) {
    return (
      <Button
        variant='ghost'
        size='sm'
        className='-ml-3 h-8'
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {label}
        {column.getIsSorted() === 'asc' && ' ↑'}
        {column.getIsSorted() === 'desc' && ' ↓'}
      </Button>
    )
  }
}
