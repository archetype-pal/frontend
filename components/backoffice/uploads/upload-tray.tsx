'use client';

import { AlertCircle, CheckCircle2, FileWarning, Loader2, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingPanel } from '@/components/backoffice/common/floating-panel';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/backoffice/upload-helpers';
import {
  UPLOAD_TERMINAL_STATUSES,
  useUploadManager,
  type UploadItem,
  type UploadItemStatus,
} from '@/contexts/upload-manager-context';

/**
 * Bottom-right tray showing every backoffice image upload. Lives in the shell
 * so it stays put across navigation; uploads keep running behind it. Hidden
 * when there is nothing to show.
 */
export function UploadTray() {
  const { items, activeCount, dismiss, cancel, clearFinished } = useUploadManager();
  if (items.length === 0) return null;

  const finishedCount = items.filter((it) => UPLOAD_TERMINAL_STATUSES.includes(it.status)).length;
  const title =
    activeCount > 0
      ? `Uploading ${activeCount} image${activeCount === 1 ? '' : 's'}…`
      : `Uploads (${items.length})`;

  return (
    <FloatingPanel
      title={title}
      icon={<UploadCloud className="h-4 w-4 text-primary" />}
      action={
        finishedCount > 0 ? (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFinished}>
            Clear finished
          </Button>
        ) : null
      }
    >
      <ul className="divide-y">
        {items.map((item) => (
          <UploadTrayItem
            key={item.id}
            item={item}
            onCancel={() => cancel(item.id)}
            onDismiss={() => dismiss(item.id)}
          />
        ))}
      </ul>
    </FloatingPanel>
  );
}

function UploadTrayItem({
  item,
  onCancel,
  onDismiss,
}: {
  item: UploadItem;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  const active = item.status === 'uploading' || item.status === 'processing';
  const pct =
    item.totalBytes > 0 ? Math.min(100, Math.round((item.sentBytes / item.totalBytes) * 100)) : 0;

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <StatusIcon status={item.status} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium" title={item.file.name}>
              {item.file.name}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatBytes(item.totalBytes)}
            </span>
          </div>
          <p className="truncate text-[10px] text-muted-foreground">{item.itemPartLabel}</p>

          {active && (
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    item.status === 'processing' ? 'bg-amber-500' : 'bg-primary'
                  )}
                  style={{ width: `${item.status === 'processing' ? 100 : pct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {item.status === 'processing'
                  ? item.message || 'Converting to JP2…'
                  : `${pct}% uploaded`}
              </p>
            </div>
          )}

          {item.status === 'done' && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
              Uploaded and published.
            </p>
          )}
          {item.status === 'error' && <p className="text-[10px] text-destructive">{item.error}</p>}
          {item.status === 'duplicate' && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              Already present — {item.error}
            </p>
          )}
          {item.status === 'canceled' && (
            <p className="text-[10px] text-muted-foreground">Canceled.</p>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          aria-label={active ? `Cancel upload of ${item.file.name}` : `Dismiss ${item.file.name}`}
          onClick={active ? onCancel : onDismiss}
          disabled={item.status === 'pending'}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

function StatusIcon({ status }: { status: UploadItemStatus }) {
  const className = 'mt-0.5 h-4 w-4 shrink-0';
  if (status === 'uploading' || status === 'processing' || status === 'pending') {
    return <Loader2 className={cn(className, 'animate-spin text-primary')} />;
  }
  if (status === 'done') {
    return <CheckCircle2 className={cn(className, 'text-emerald-600 dark:text-emerald-400')} />;
  }
  if (status === 'error') return <AlertCircle className={cn(className, 'text-destructive')} />;
  if (status === 'duplicate') {
    return <FileWarning className={cn(className, 'text-amber-600 dark:text-amber-400')} />;
  }
  return <X className={cn(className, 'text-muted-foreground')} />;
}
