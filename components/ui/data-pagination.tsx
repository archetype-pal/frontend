'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getPageTokens, PAGE_SIZE_OPTIONS } from '@/lib/pagination';
import { smoothScrollToElement } from '@/lib/scroll-utils';
import { cn } from '@/lib/utils';

export type DataPaginationProps = {
  totalItems: number;
  page: number;
  pageSize: number;
  /** `clamped`: the page was past the end and is moved to the last page. */
  onPageChange: (page: number, options?: { clamped: boolean }) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  summary?: React.ReactNode;
  className?: string;
  siblingCount?: number;
  scrollTargetRef?: React.RefObject<HTMLElement | null>;
};

function PageJumpInput({
  currentPage,
  totalPages,
  onPageChange,
  describedById,
  inputId,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  describedById: string;
  inputId: string;
}) {
  const [draft, setDraft] = React.useState(String(currentPage));

  const commit = () => {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(currentPage));
      return;
    }
    const target = Math.min(Math.max(parsed, 1), totalPages);
    setDraft(String(target));
    if (target !== currentPage) {
      onPageChange(target);
    }
  };

  return (
    <Input
      id={inputId}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      value={draft}
      onChange={(event) => setDraft(event.target.value.replace(/\D/g, ''))}
      onFocus={(event) => event.target.select()}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        } else if (event.key === 'Escape') {
          setDraft(String(currentPage));
        }
      }}
      aria-describedby={describedById}
      className="h-8 w-16 text-center text-foreground tabular-nums text-sm"
    />
  );
}

export function DataPagination({
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  summary,
  className,
  siblingCount = 1,
  scrollTargetRef,
}: DataPaginationProps) {
  const t = useTranslations('common.pagination');
  const tCommon = useTranslations('common');

  const pageSizeLabelId = React.useId();
  const jumpInputId = React.useId();
  const jumpTotalId = React.useId();

  const handlePageChange = (targetPage: number) => {
    onPageChange(targetPage);
    smoothScrollToElement(scrollTargetRef?.current ?? null, { duration: 250 });
  };

  const lastPage = Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));
  const checkedTotal = React.useRef<number | null>(null);
  React.useEffect(() => {
    // Only on a total change: a page size change resets the page itself.
    if (checkedTotal.current === totalItems) return;
    checkedTotal.current = totalItems;
    if (totalItems > 0 && page > lastPage) onPageChange(lastPage, { clamped: true });
  }, [totalItems, page, lastPage, onPageChange]);

  if (totalItems <= 0) {
    return null;
  }

  const effectivePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const tokens = getPageTokens(currentPage, totalPages, siblingCount);

  const firstItem = (currentPage - 1) * effectivePageSize + 1;
  const lastItem = Math.min(currentPage * effectivePageSize, totalItems);

  const effectiveOptions = Array.from(new Set([...pageSizeOptions, effectivePageSize])).sort(
    (a, b) => a - b
  );

  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPages;
  const showNav = totalPages > 1;
  const showPageJump = tokens.some((token) => typeof token === 'string');

  const handlePageSizeSelect = (value: string) => {
    const nextSize = Number.parseInt(value, 10);
    if (!Number.isNaN(nextSize) && onPageSizeChange) {
      onPageSizeChange(nextSize);
    }
  };

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center gap-4 lg:flex-row lg:justify-between',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
        {onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span id={pageSizeLabelId}>{t('rowsPerPage')}</span>
            <Select value={String(effectivePageSize)} onValueChange={handlePageSizeSelect}>
              <SelectTrigger
                aria-labelledby={pageSizeLabelId}
                className="h-8 w-18 text-xs text-foreground"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {effectiveOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {summary !== undefined ? (
          <div>{summary}</div>
        ) : (
          <p aria-live="polite">
            <span className="font-medium text-foreground tabular-nums">
              {t('range', { from: firstItem, to: lastItem, total: totalItems })}
            </span>
          </p>
        )}
      </div>

      {showNav ? (
        <nav aria-label={t('navLabel')} className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2.5"
            disabled={isFirst}
            onClick={() => handlePageChange(currentPage - 1)}
            aria-label={t('previousPage')}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{tCommon('previous')}</span>
          </Button>

          {tokens.map((token, index) =>
            typeof token === 'number' ? (
              <Button
                key={token}
                variant={token === currentPage ? 'outline' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0 tabular-nums"
                aria-current={token === currentPage ? 'page' : undefined}
                aria-label={
                  token === currentPage
                    ? t('currentPageN', { page: token })
                    : t('goToPageN', { page: token })
                }
                onClick={() => handlePageChange(token)}
              >
                {token}
              </Button>
            ) : (
              <span
                key={`${token}-${index}`}
                aria-hidden
                className="flex h-8 w-8 items-center justify-center text-muted-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">…</span>
              </span>
            )
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2.5"
            disabled={isLast}
            onClick={() => handlePageChange(currentPage + 1)}
            aria-label={t('nextPage')}
          >
            <span className="hidden sm:inline">{tCommon('next')}</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      ) : null}

      {showPageJump ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <label htmlFor={jumpInputId}>{t('goToPage')}</label>
          <PageJumpInput
            key={currentPage}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            describedById={jumpTotalId}
            inputId={jumpInputId}
          />
          <span id={jumpTotalId}>{t('ofPages', { total: totalPages })}</span>
        </div>
      ) : null}
    </div>
  );
}
