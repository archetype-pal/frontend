import * as React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  count: number
  limit: number
  offset: number
  onPageChange: (page: number) => void
  onLimitChange?: (limit: number) => void
}

const LIMIT_OPTIONS = [10, 20, 50, 100]

export function Pagination({
  count,
  limit,
  offset,
  onPageChange,
  onLimitChange,
}: Props) {
  const totalPages = Math.ceil(count / limit)
  const currentPage = Math.floor(offset / limit) + 1

  const showPageControls = totalPages > 1

  const generatePages = () => {
    const pages: (number | 'ellipsis')[] = []
    const siblings = 1

    const left = Math.max(currentPage - siblings, 2)
    const right = Math.min(currentPage + siblings, totalPages - 1)

    pages.push(1)
    if (left > 2) pages.push('ellipsis')
    for (let i = left; i <= right; i++) pages.push(i)
    if (right < totalPages - 1) pages.push('ellipsis')
    if (totalPages > 1) pages.push(totalPages)

    return pages
  }

  const pages = generatePages()

  return (
    <div className="flex items-center justify-between gap-4 w-full flex-wrap px-1">
      {/* Results per page */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Select value={String(limit)} onValueChange={(value) => onLimitChange?.(parseInt(value))}>
          <SelectTrigger className="w-[110px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIMIT_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={String(opt)}>
                {opt} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Page controls */}
      {showPageControls && (
        <nav className="flex items-center gap-1 text-sm flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ◄
          </Button>

          {pages.map((page, i) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-gray-500">
                …
              </span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(page)}
                className={cn(
                  page === currentPage && 'font-semibold'
                )}
              >
                {page}
              </Button>
            )
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            ►
          </Button>
        </nav>
      )}
    </div>
  )
}