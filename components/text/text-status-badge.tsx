import type { ImageTextDetail } from '@/services/image-texts';

const STATUS_PALETTE: Record<ImageTextDetail['status'], string> = {
  Live: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  Reviewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  Review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  Draft: 'bg-muted text-muted-foreground',
};

export function TextStatusBadge({ status }: { status: ImageTextDetail['status'] }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_PALETTE[status]}`}>
      {status}
    </span>
  );
}
