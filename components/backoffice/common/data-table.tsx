'use client';

import { useState, useRef, useEffect } from 'react';
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
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronLeft, ChevronRight, Search, Columns, Download, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { escapeCsvField } from '@/lib/backoffice/csv-escape';
import { BackofficeErrorState } from './query-state';

export interface BulkAction {
  label: string;
  action: (ids: string[]) => void;
  variant?: 'destructive' | 'default';
  icon?: React.ReactNode;
}

export interface PresetFilter<TData> {
  /** Display label for the tab, e.g. "All", "Missing dates", "Drafts" */
  label: string;
  /** Filter function applied to data. Return true to include the row. */
  filter?: (row: TData) => boolean;
  /** Optional count override (e.g. from server data) */
  count?: number;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Key of the column used for the global search input (client-side filtering). */
  searchColumn?: string;
  searchPlaceholder?: string;
  /**
   * Controlled search value for server-side search.
   * When provided together with `onSearchChange`, the search input is controlled
   * externally and no client-side column filtering is applied.
   */
  searchValue?: string;
  /** Callback fired when the search input changes (server-side search mode). */
  onSearchChange?: (value: string) => void;
  /** Actions rendered in the toolbar (e.g. a "New" button). */
  toolbarActions?: React.ReactNode;
  /** Enable client-side pagination (default: true). */
  pagination?: boolean;
  pageSize?: number;
  /** Enable row selection with checkboxes. */
  enableRowSelection?: boolean;
  /** Bulk actions shown when rows are selected. */
  bulkActions?: BulkAction[];
  /** Unique ID accessor for bulk actions (default: 'id'). */
  getRowId?: (row: TData) => string;
  /** Enable column visibility toggle. */
  enableColumnVisibility?: boolean;
  /** Enable CSV export of current view. */
  enableExport?: boolean;
  /** Filename for CSV export. */
  exportFilename?: string;
  /** Content for filter bar above the table. */
  filterBar?: React.ReactNode;
  /** Preset filter views displayed as tabs above the table. */
  presetFilters?: PresetFilter<TData>[];
  /** Render an error row (instead of "No results") when the data query failed. */
  isError?: boolean;
  /** Retry handler shown with the error row (typically the query's `refetch`). */
  onRetry?: () => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder,
  searchValue,
  onSearchChange,
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
  isError = false,
  onRetry,
}: DataTableProps<TData, TValue>) {
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [activePreset, setActivePreset] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const hasSearch = !!(searchColumn || onSearchChange);

  // "/" shortcut to focus search input
  useEffect(() => {
    if (!hasSearch) return;
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
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [hasSearch]);

  // Apply preset filter to data
  const filteredData =
    presetFilters && presetFilters[activePreset]?.filter
      ? data.filter(presetFilters[activePreset].filter!)
      : data;

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
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label={t('dataTable.selectAll')}
              className="translate-y-[2px]"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={t('dataTable.selectRow')}
              className="translate-y-[2px]"
            />
          ),
          enableSorting: false,
          enableHiding: false,
          size: 32,
        } as ColumnDef<TData, TValue>,
        ...columns,
      ]
    : columns;

  // TanStack Table's useReactTable() returns unstable refs; React Compiler skip is intentional.
  // @tanstack/react-table + React 19: incompatible-library until upstream support; disable is intentional
  // eslint-disable-next-line react-hooks/incompatible-library
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
  });

  const selectedCount = Object.keys(rowSelection).length;
  const selectedIds = Object.keys(rowSelection);

  function handleExport() {
    const headers = table
      .getVisibleLeafColumns()
      .filter((c) => c.id !== 'select' && c.id !== 'actions')
      .map((c) => c.id);

    const rows = table.getFilteredRowModel().rows.map((row) =>
      headers
        .map((h) => {
          const val = row.getValue(h);
          // `escapeCsvField` handles delimiters/quotes/newlines AND neutralizes
          // formula-injection prefixes (`=`, `+`, `-`, `@`, tab, `\r`) so a
          // backoffice CSV opened in Excel/Sheets can't execute hostile
          // content from a researcher-edited description or name field.
          return escapeCsvField(String(val ?? ''));
        })
        .join(',')
    );

    // Escape the header row through the same path as the data cells —
    // column ids today are machine identifiers, but a future renaming
    // could introduce a comma, quote, or formula-prefix character that
    // would otherwise break CSV alignment for the whole file.
    const csv = [headers.map(escapeCsvField).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportFilename}.csv`;
    // Append-click-remove instead of bare `.click()` on a detached node.
    // Modern Chrome/Firefox/Safari trigger the download fine, but older
    // Firefox versions and some mobile Safari builds silently no-op the
    // click on an unattached anchor — admins on those browsers got no
    // export file. Same fix as cycle 179's search-results exporter and
    // cycle 149's lightbox exporter.
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      {/* Preset filter tabs */}
      {presetFilters && presetFilters.length > 1 && (
        <div className="flex items-center gap-1 border-b">
          {presetFilters.map((preset, i) => {
            const count =
              preset.count ?? (preset.filter ? data.filter(preset.filter).length : data.length);
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setActivePreset(i)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px',
                  i === activePreset
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {preset.label}
                <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filter bar */}
      {filterBar && <div className="flex flex-wrap items-center gap-2">{filterBar}</div>}

      {/* Toolbar */}
      {(hasSearch || toolbarActions || enableColumnVisibility || enableExport) && (
        <div className="flex items-center gap-2">
          {hasSearch && (
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder={searchPlaceholder ?? t('dataTable.searchPlaceholder')}
                value={
                  onSearchChange
                    ? (searchValue ?? '')
                    : ((table.getColumn(searchColumn!)?.getFilterValue() as string) ?? '')
                }
                onChange={(e) =>
                  onSearchChange
                    ? onSearchChange(e.target.value)
                    : table.getColumn(searchColumn!)?.setFilterValue(e.target.value)
                }
                className="pl-8 pr-8 h-9"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                /
              </kbd>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {enableExport && (
              <Button variant="outline" size="sm" className="h-9 gap-1" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tCommon('export')}</span>
              </Button>
            )}
            {enableColumnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1">
                    <Columns className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t('dataTable.columns')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {table
                    .getAllColumns()
                    .filter((col) => col.getCanHide())
                    .map((col) => (
                      <DropdownMenuCheckboxItem
                        key={col.id}
                        className="capitalize"
                        checked={col.getIsVisible()}
                        onCheckedChange={(value) => col.toggleVisibility(!!value)}
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
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">
            {t('dataTable.selectedCount', { count: selectedCount })}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {bulkActions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => action.action(selectedIds)}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setRowSelection({})}
            >
              <X className="h-3 w-3" />
              {tCommon('clear')}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isError ? (
              <TableRow>
                <TableCell colSpan={finalColumns.length} className="h-24 p-0">
                  <BackofficeErrorState
                    message={t('dataTable.loadError')}
                    onRetry={() => onRetry?.()}
                  />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={finalColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t('dataTable.noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {enableRowSelection && selectedCount > 0
              ? t('dataTable.selectedOfTotal', {
                  count: selectedCount,
                  total: table.getFilteredRowModel().rows.length,
                })
              : t('dataTable.rowsTotal', { count: table.getFilteredRowModel().rows.length })}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 tabular-nums">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper: creates a sortable header for a column.
 * Usage: `header: sortableHeader('Name')`
 */
export function sortableHeader(label: string) {
  return function SortableHeader({
    column,
  }: {
    column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' };
  }) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {label}
        {column.getIsSorted() === 'asc' && ' \u2191'}
        {column.getIsSorted() === 'desc' && ' \u2193'}
      </Button>
    );
  };
}
