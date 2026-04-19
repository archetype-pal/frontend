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
  if (total <= pageSize) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground tabular-nums">
        Page {page + 1} of {Math.ceil(total / pageSize)}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasNext}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
