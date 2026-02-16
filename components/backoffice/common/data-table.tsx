'use client'

import { useState, useRef, useEffect } from 'react'
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronLeft, ChevronRight, Search, Columns, Download, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BulkAction {
  label: string
  action: (ids: string[]) => void
  variant?: 'destructive' | 'default'
  icon?: React.ReactNode
}

export interface PresetFilter<TData> {
  /** Display label for the tab, e.g. "All", "Missing dates", "Drafts" */
  label: string
  /** Filter function applied to data. Return true to include the row. */
  filter?: (row: TData) => boolean
  /** Optional count override (e.g. from server data) */
  count?: number
}

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
  /** Enable row selection with checkboxes. */
  enableRowSelection?: boolean
  /** Bulk actions shown when rows are selected. */
  bulkActions?: BulkAction[]
  /** Unique ID accessor for bulk actions (default: 'id'). */
  getRowId?: (row: TData) => string
  /** Enable column visibility toggle. */
  enableColumnVisibility?: boolean
  /** Enable CSV export of current view. */
  enableExport?: boolean
  /** Filename for CSV export. */
  exportFilename?: string
  /** Content for filter bar above the table. */
  filterBar?: React.ReactNode
  /** Preset filter views displayed as tabs above the table. */
  presetFilters?: PresetFilter<TData>[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = 'Search...',
  toolbarActions,
  pagination = true,
  pageSize = 20,
  enableRowSelection = false,
  bulkActions,
  getRowId,
  enableColumnVisibility = false,
  enableExport = false,
  exportFilename = 'export',
  filterBar,
  presetFilters,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [activePreset, setActivePreset] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // "/" shortcut to focus search input
  useEffect(() => {
    if (!searchColumn) return
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [searchColumn])

  // Apply preset filter to data
  const filteredData =
    presetFilters && presetFilters[activePreset]?.filter
      ? data.filter(presetFilters[activePreset].filter!)
      : data

  // Prepend checkbox column if selection is enabled
  const finalColumns: ColumnDef<TData, TValue>[] = enableRowSelection
    ? [
        {
          id: 'select',
          header: ({ table }) => (
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && 'indeterminate')
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label='Select all'
              className='translate-y-[2px]'
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label='Select row'
              className='translate-y-[2px]'
            />
          ),
          enableSorting: false,
          enableHiding: false,
          size: 32,
        } as ColumnDef<TData, TValue>,
        ...columns,
      ]
    : columns

  const table = useReactTable({
    data: filteredData,
    columns: finalColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(pagination && { getPaginationRowModel: getPaginationRowModel() }),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection,
    getRowId: getRowId
      ? (row) => getRowId(row)
      : (row) => String((row as Record<string, unknown>).id ?? ''),
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    initialState: { pagination: { pageSize } },
  })

  const selectedCount = Object.keys(rowSelection).length
  const selectedIds = Object.keys(rowSelection)

  function handleExport() {
    const headers = table
      .getVisibleLeafColumns()
      .filter((c) => c.id !== 'select' && c.id !== 'actions')
      .map((c) => c.id)

    const rows = table.getFilteredRowModel().rows.map((row) =>
      headers
        .map((h) => {
          const val = row.getValue(h)
          const str = String(val ?? '')
          return str.includes(',') || str.includes('"')
            ? `"${str.replace(/"/g, '""')}"`
            : str
        })
        .join(',')
    )

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${exportFilename}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className='space-y-3'>
      {/* Preset filter tabs */}
      {presetFilters && presetFilters.length > 1 && (
        <div className='flex items-center gap-1 border-b'>
          {presetFilters.map((preset, i) => {
            const count =
              preset.count ??
              (preset.filter ? data.filter(preset.filter).length : data.length)
            return (
              <button
                key={preset.label}
                type='button'
                onClick={() => setActivePreset(i)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px',
                  i === activePreset
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {preset.label}
                <span className='ml-1.5 text-[10px] tabular-nums text-muted-foreground'>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Filter bar */}
      {filterBar && <div className='flex flex-wrap items-center gap-2'>{filterBar}</div>}

      {/* Toolbar */}
      {(searchColumn || toolbarActions || enableColumnVisibility || enableExport) && (
        <div className='flex items-center gap-2'>
          {searchColumn && (
            <div className='relative max-w-sm flex-1'>
              <Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                ref={searchInputRef}
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
                className='pl-8 pr-8 h-9'
              />
              <kbd className='absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground'>
                /
              </kbd>
            </div>
          )}
          <div className='ml-auto flex items-center gap-2'>
            {enableExport && (
              <Button
                variant='outline'
                size='sm'
                className='h-9 gap-1'
                onClick={handleExport}
              >
                <Download className='h-3.5 w-3.5' />
                <span className='hidden sm:inline'>Export</span>
              </Button>
            )}
            {enableColumnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='sm' className='h-9 gap-1'>
                    <Columns className='h-3.5 w-3.5' />
                    <span className='hidden sm:inline'>Columns</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-40'>
                  {table
                    .getAllColumns()
                    .filter((col) => col.getCanHide())
                    .map((col) => (
                      <DropdownMenuCheckboxItem
                        key={col.id}
                        className='capitalize'
                        checked={col.getIsVisible()}
                        onCheckedChange={(value) =>
                          col.toggleVisibility(!!value)
                        }
                      >
                        {col.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {toolbarActions}
          </div>
        </div>
      )}

      {/* Bulk actions bar */}
      {selectedCount > 0 && bulkActions && bulkActions.length > 0 && (
        <div className='flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2'>
          <span className='text-sm font-medium'>
            {selectedCount} selected
          </span>
          <div className='ml-auto flex items-center gap-2'>
            {bulkActions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                size='sm'
                className='h-7 gap-1 text-xs'
                onClick={() => action.action(selectedIds)}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
            <Button
              variant='ghost'
              size='sm'
              className='h-7 gap-1 text-xs'
              onClick={() => setRowSelection({})}
            >
              <X className='h-3 w-3' />
              Clear
            </Button>
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
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
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
                  colSpan={finalColumns.length}
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
            {enableRowSelection && selectedCount > 0
              ? `${selectedCount} of ${table.getFilteredRowModel().rows.length} selected`
              : `${table.getFilteredRowModel().rows.length} row(s) total`}
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
        {column.getIsSorted() === 'asc' && ' \u2191'}
        {column.getIsSorted() === 'desc' && ' \u2193'}
      </Button>
    )
  }
}
