'use client';

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  FileImage,
  FileWarning,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import {
  ACCEPTED_UPLOAD_EXTENSIONS,
  formatBytes,
  guessLocusFromFilename,
  isAcceptedImageFilename,
} from '@/lib/backoffice/upload-helpers';
import {
  describeUploadError,
  isConflictError,
  uploadImageFile,
  type UploadPhase,
} from '@/services/backoffice/uploads';

interface ItemImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemPartId: number;
  itemPartLabel: string;
  historicalItemId: number;
}

type RowStatus =
  'queued' | 'uploading' | 'processing' | 'done' | 'error' | 'duplicate' | 'canceled';

interface UploadRow {
  id: string;
  file: File;
  locus: string;
  tags: string;
  status: RowStatus;
  phase: UploadPhase | null;
  sentBytes: number;
  message: string;
  error: string;
  controller: AbortController | null;
}

const TERMINAL: RowStatus[] = ['done', 'error', 'duplicate', 'canceled'];

export function ItemImageUploadDialog({
  open,
  onOpenChange,
  itemPartId,
  itemPartLabel,
  historicalItemId,
}: ItemImageUploadDialogProps) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [running, setRunning] = useState(false);

  const patchRow = useCallback((id: string, patch: Partial<UploadRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    const accepted: UploadRow[] = [];
    const rejected: string[] = [];
    for (const file of incoming) {
      if (isAcceptedImageFilename(file.name)) {
        accepted.push({
          id: crypto.randomUUID(),
          file,
          locus: guessLocusFromFilename(file.name),
          tags: '',
          status: 'queued',
          phase: null,
          sentBytes: 0,
          message: '',
          error: '',
          controller: null,
        });
      } else {
        rejected.push(file.name);
      }
    }
    if (accepted.length) setRows((prev) => [...prev, ...accepted]);
    if (rejected.length) {
      toast.error(`Skipped ${rejected.length} unsupported file(s)`, {
        description: `Allowed: ${ACCEPTED_UPLOAD_EXTENSIONS.join(', ')}`,
      });
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeRow = useCallback((id: string) => {
    setRows((prev) => {
      const row = prev.find((r) => r.id === id);
      row?.controller?.abort();
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const startUpload = useCallback(async () => {
    if (!token) return;
    const pending = rows.filter((r) => r.status === 'queued' || r.status === 'error');
    if (pending.length === 0) return;
    setRunning(true);
    let succeeded = 0;
    let duplicates = 0;
    let failed = 0;

    // Sequential: large scans should not contend for bandwidth, and the
    // server's single Celery worker processes them one at a time anyway.
    for (const row of pending) {
      const controller = new AbortController();
      patchRow(row.id, {
        status: 'uploading',
        phase: 'creating',
        error: '',
        sentBytes: 0,
        controller,
      });
      try {
        await uploadImageFile(
          token,
          row.file,
          { item_part: itemPartId, locus: row.locus.trim(), tags: row.tags.trim() },
          {
            signal: controller.signal,
            onProgress: (p) => {
              patchRow(row.id, {
                status: p.phase === 'processing' ? 'processing' : 'uploading',
                phase: p.phase,
                sentBytes: p.sentBytes,
                message: p.message ?? '',
              });
            },
          }
        );
        patchRow(row.id, { status: 'done', phase: 'complete', message: '' });
        succeeded++;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          patchRow(row.id, { status: 'canceled', controller: null });
          continue;
        }
        const message = describeUploadError(err);
        if (isConflictError(err)) {
          // Destination already taken — an expected outcome, not a failure.
          duplicates++;
          patchRow(row.id, { status: 'duplicate', error: message, controller: null });
        } else {
          failed++;
          patchRow(row.id, { status: 'error', error: message, controller: null });
        }
      }
    }

    setRunning(false);
    // Refetch the part's images whenever the server state may differ from
    // what's rendered: a new upload succeeded, OR a duplicate proved an image
    // is already present that this (possibly reloaded) page hasn't shown yet
    // — e.g. an upload that finished server-side after a mid-upload refresh.
    if (succeeded > 0 || duplicates > 0) {
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
      });
    }
    if (succeeded > 0) {
      toast.success(`Uploaded ${succeeded} image${succeeded === 1 ? '' : 's'}`, {
        description: 'Search reindex was scheduled automatically.',
      });
    }
    if (duplicates > 0) {
      toast.warning(`${duplicates} image${duplicates === 1 ? '' : 's'} already uploaded`, {
        description:
          'Already present on the server (its thumbnail is now shown). Rename the file to upload a separate copy.',
      });
    }
    if (failed > 0) {
      toast.error(`${failed} upload${failed === 1 ? '' : 's'} failed`, {
        description: 'See the per-file messages for details.',
      });
    }
  }, [rows, token, itemPartId, historicalItemId, patchRow, queryClient]);

  const queuedCount = rows.filter((r) => r.status === 'queued' || r.status === 'error').length;
  const allTerminal = rows.length > 0 && rows.every((r) => TERMINAL.includes(r.status));

  const handleClose = (next: boolean) => {
    if (!next && running) return; // block close mid-upload
    if (!next) setRows([]);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Add images</DialogTitle>
          <DialogDescription>
            Upload manuscript scans to <span className="font-medium">{itemPartLabel}</span>. Each
            file is converted to a lossless JP2 and served through IIIF. Large TIFFs (up to several
            GB) upload in resumable chunks.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-1">
          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Add images to upload"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            )}
          >
            <Upload className="h-8 w-8 text-muted-foreground opacity-50" />
            <p className="text-sm font-medium">Drop scans here or click to browse</p>
            <p className="text-xs text-muted-foreground">{ACCEPTED_UPLOAD_EXTENSIONS.join(', ')}</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED_UPLOAD_EXTENSIONS.join(',')}
              className="hidden"
              aria-label="Choose image files"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                if (inputRef.current) inputRef.current.value = '';
              }}
            />
          </div>

          {/* File queue — the one scrolling region; native overflow so it
              works against the flex-bounded height (Radix ScrollArea's
              h-full viewport needs a definite parent height, which max-h
              alone doesn't provide). */}
          {rows.length > 0 && (
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {rows.map((row) => (
                <UploadRowItem
                  key={row.id}
                  row={row}
                  disabled={running}
                  onLocusChange={(v) => patchRow(row.id, { locus: v })}
                  onTagsChange={(v) => patchRow(row.id, { tags: v })}
                  onRemove={() => removeRow(row.id)}
                  onCancel={() => row.controller?.abort()}
                />
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleClose(false)}
            disabled={running}
          >
            {allTerminal ? 'Close' : 'Cancel'}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={startUpload}
            disabled={running || queuedCount === 0}
          >
            {running ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {running
              ? 'Uploading…'
              : `Upload ${queuedCount || ''} image${queuedCount === 1 ? '' : 's'}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadRowItem({
  row,
  disabled,
  onLocusChange,
  onTagsChange,
  onRemove,
  onCancel,
}: {
  row: UploadRow;
  disabled: boolean;
  onLocusChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const pct =
    row.file.size > 0 ? Math.min(100, Math.round((row.sentBytes / row.file.size) * 100)) : 0;
  const active = row.status === 'uploading' || row.status === 'processing';
  const editable = row.status === 'queued' || row.status === 'error';

  return (
    <li className="rounded-md border p-2.5">
      <div className="flex items-start gap-2.5">
        <StatusIcon status={row.status} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium" title={row.file.name}>
              {row.file.name}
            </p>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatBytes(row.file.size)}
            </span>
          </div>

          {editable && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Locus</Label>
                <Input
                  value={row.locus}
                  onChange={(e) => onLocusChange(e.target.value)}
                  placeholder="e.g. f.1r"
                  className="h-7 text-xs"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Tags</Label>
                <Input
                  value={row.tags}
                  onChange={(e) => onTagsChange(e.target.value)}
                  placeholder="comma,separated"
                  className="h-7 text-xs"
                  disabled={disabled}
                />
              </div>
            </div>
          )}

          {active && (
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    row.status === 'processing' ? 'bg-amber-500' : 'bg-primary'
                  )}
                  style={{ width: `${row.status === 'processing' ? 100 : pct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {row.status === 'processing'
                  ? row.message || 'Converting to JP2…'
                  : `${pct}% uploaded`}
              </p>
            </div>
          )}

          {row.status === 'done' && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
              Uploaded and published.
            </p>
          )}
          {row.status === 'error' && <p className="text-[10px] text-destructive">{row.error}</p>}
          {row.status === 'duplicate' && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              Already present — {row.error}
            </p>
          )}
          {row.status === 'canceled' && (
            <p className="text-[10px] text-muted-foreground">Canceled.</p>
          )}
        </div>

        {active ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            aria-label={`Cancel upload of ${row.file.name}`}
            onClick={onCancel}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : (
          !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              aria-label={`Remove ${row.file.name}`}
              onClick={onRemove}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )
        )}
      </div>
    </li>
  );
}

function StatusIcon({ status }: { status: RowStatus }) {
  const className = 'mt-0.5 h-4 w-4 shrink-0';
  if (status === 'uploading' || status === 'processing') {
    return <Loader2 className={cn(className, 'animate-spin text-primary')} />;
  }
  if (status === 'done') {
    return <CheckCircle2 className={cn(className, 'text-emerald-600 dark:text-emerald-400')} />;
  }
  if (status === 'error') return <AlertCircle className={cn(className, 'text-destructive')} />;
  if (status === 'duplicate') {
    return <FileWarning className={cn(className, 'text-amber-600 dark:text-amber-400')} />;
  }
  return <FileImage className={cn(className, 'text-muted-foreground')} />;
}
