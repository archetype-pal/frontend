import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

interface ServerPaginationProps {
  /** Total number of items */
  total: number;
  /** Items per page */
  pageSize: number;
  /** Current zero-based page index */
  page: number;
  /** Whether there is a next page (from API `next` field) */
  hasNext: boolean;
  onPageChange: (page: number) => void;
}

export function ServerPagination({
  total,
  pageSize,
  page,
  hasNext,
  onPageChange,
}: ServerPaginationProps) {
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');

  if (total <= pageSize) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        {tCommon('previous')}
      </Button>
      <span className="text-sm text-muted-foreground tabular-nums">
        {t('pagination.pageOf', { page: page + 1, total: Math.ceil(total / pageSize) })}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasNext}
        onClick={() => onPageChange(page + 1)}
      >
        {tCommon('next')}
      </Button>
    </div>
  );
}
