'use client';

import { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileWarning,
  FolderOpen,
  History,
  Loader2,
  RotateCcw,
  UploadCloud,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingPanel } from '@/components/backoffice/common/floating-panel';
import { cn } from '@/lib/utils';
import { ACCEPTED_UPLOAD_EXTENSIONS, formatBytes } from '@/lib/backoffice/upload-helpers';
import type { UploadBreadcrumb } from '@/lib/backoffice/upload-breadcrumbs';
import {
  UPLOAD_TERMINAL_STATUSES,
  useUploadManager,
  type ResumeResult,
  type UploadItem,
  type UploadItemStatus,
} from '@/contexts/upload-manager-context';

/**
 * Bottom-right tray showing every backoffice image upload. Lives in the shell
 * so it stays put across navigation; uploads keep running behind it. Also
 * surfaces uploads interrupted by a reload (recovered from breadcrumbs) with a
 * re-select-to-resume prompt — the browser cannot restore the File itself.
 * Hidden when there is nothing to show.
 */
export function UploadTray() {
  const {
    items,
    interrupted,
    activeCount,
    dismiss,
    cancel,
    retry,
    clearFinished,
    resumeInterrupted,
    dismissInterrupted,
  } = useUploadManager();
  const [collapsed, setCollapsed] = useState(false);
  if (items.length === 0 && interrupted.length === 0) return null;

  const finishedCount = items.filter((it) => UPLOAD_TERMINAL_STATUSES.includes(it.status)).length;
  const title =
    activeCount > 0
      ? `Uploading ${activeCount} image${activeCount === 1 ? '' : 's'}…`
      : interrupted.length > 0
        ? `Interrupted upload${interrupted.length === 1 ? '' : 's'} (${interrupted.length})`
        : `Uploads (${items.length})`;

  return (
    <FloatingPanel
      title={title}
      icon={<UploadCloud className="h-4 w-4 text-primary" />}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed((c) => !c)}
      action={
        finishedCount > 0 && !collapsed ? (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFinished}>
            Clear finished
          </Button>
        ) : null
      }
    >
      {interrupted.length > 0 && (
        <div className="border-b">
          <p className="px-3 pb-1 pt-2.5 text-[10px] text-muted-foreground">
            Interrupted by a reload. Re-add a file to resume — parts already uploaded are not
            re-sent.
          </p>
          <ul className="divide-y">
            {interrupted.map((crumb) => (
              <InterruptedTrayItem
                key={crumb.id}
                crumb={crumb}
                onResume={resumeInterrupted}
                onDismiss={() => dismissInterrupted(crumb.id)}
              />
            ))}
          </ul>
        </div>
      )}
      {items.length > 0 && (
        <ul className="divide-y">
          {items.map((item) => (
            <UploadTrayItem
              key={item.id}
              item={item}
              onCancel={() => cancel(item.id)}
              onRetry={() => retry(item.id)}
              onDismiss={() => dismiss(item.id)}
            />
          ))}
        </ul>
      )}
    </FloatingPanel>
  );
}

/**
 * One upload lost to a reload: the breadcrumb knows what/where, only the File
 * is gone. The picker allows multi-select and matching is global — selecting a
 * whole batch on any row resumes every interrupted upload it fits.
 */
function InterruptedTrayItem({
  crumb,
  onResume,
  onDismiss,
}: {
  crumb: UploadBreadcrumb;
  onResume: (files: File[]) => ResumeResult;
  onDismiss: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mismatch, setMismatch] = useState('');

  const handlePick = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;
    const { unmatched } = onResume(files);
    setMismatch(
      unmatched.length > 0
        ? `No match for ${unmatched.map((n) => `"${n}"`).join(', ')} — this upload needs "${crumb.fileName}" (${formatBytes(crumb.fileSize)}).`
        : ''
    );
  };

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <History className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium" title={crumb.fileName}>
              {crumb.fileName}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatBytes(crumb.fileSize)}
            </span>
          </div>
          <p className="truncate text-[10px] text-muted-foreground">{crumb.itemPartLabel}</p>
          {mismatch && <p className="text-[10px] text-destructive">{mismatch}</p>}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_UPLOAD_EXTENSIONS.join(',')}
            className="hidden"
            aria-label={`Re-select file for ${crumb.fileName}`}
            onChange={(e) => {
              handlePick(e.target.files);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 gap-1 px-2 text-[10px]"
            onClick={() => inputRef.current?.click()}
          >
            <FolderOpen className="h-3 w-3" />
            Re-add file to resume
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          aria-label={`Discard interrupted upload ${crumb.fileName}`}
          onClick={onDismiss}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

function UploadTrayItem({
  item,
  onCancel,
  onRetry,
  onDismiss,
}: {
  item: UploadItem;
  onCancel: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const active = item.status === 'uploading' || item.status === 'processing';
  // A recovered watch item has no File in memory — nothing to retry with.
  const retryable = (item.status === 'error' || item.status === 'canceled') && item.file != null;
  const pct =
    item.totalBytes > 0 ? Math.min(100, Math.round((item.sentBytes / item.totalBytes) * 100)) : 0;

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <StatusIcon status={item.status} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium" title={item.fileName}>
              {item.fileName}
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

        <div className="flex shrink-0 items-center gap-0.5">
          {retryable && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label={`Retry upload of ${item.fileName}`}
              onClick={onRetry}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label={active ? `Cancel upload of ${item.fileName}` : `Dismiss ${item.fileName}`}
            onClick={active ? onCancel : onDismiss}
            disabled={item.status === 'pending'}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
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
