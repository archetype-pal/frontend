'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import {
  describeUploadError,
  isConflictError,
  uploadImageFile,
  type UploadPhase,
} from '@/services/backoffice/uploads';

export type UploadItemStatus =
  'pending' | 'uploading' | 'processing' | 'done' | 'error' | 'duplicate' | 'canceled';

export interface UploadItem {
  id: string;
  file: File;
  itemPartId: number;
  itemPartLabel: string;
  historicalItemId: number;
  locus: string;
  tags: string;
  status: UploadItemStatus;
  phase: UploadPhase | null;
  sentBytes: number;
  totalBytes: number;
  message: string;
  error: string;
}

export interface EnqueueFile {
  file: File;
  locus: string;
  tags: string;
}

export interface EnqueueTarget {
  itemPartId: number;
  itemPartLabel: string;
  historicalItemId: number;
}

interface UploadManagerValue {
  items: UploadItem[];
  activeCount: number;
  enqueue: (files: EnqueueFile[], target: EnqueueTarget) => void;
  cancel: (id: string) => void;
  /** Re-run a failed/canceled item. Works only while the tab is open (the
   *  File is still in memory); the server resume then re-sends just the
   *  chunks it hasn't already received. */
  retry: (id: string) => void;
  dismiss: (id: string) => void;
  clearFinished: () => void;
}

export const UPLOAD_TERMINAL_STATUSES: UploadItemStatus[] = [
  'done',
  'error',
  'duplicate',
  'canceled',
];

const UploadManagerContext = createContext<UploadManagerValue | null>(null);

/**
 * Owns image uploads for the whole backoffice. Mounted once in BackofficeShell
 * so uploads keep running (and stay visible in the tray) as the user navigates
 * between backoffice pages — a modal can't do that because it unmounts on
 * close. Reuses the `uploadImageFile` orchestrator unchanged; this layer only
 * adds a queue, cross-navigation lifetime, and per-manuscript cache
 * invalidation.
 *
 * Uploads run sequentially (one server-side Celery worker; avoids bandwidth
 * contention on large scans). State is in-memory: a full page reload ends
 * in-flight transfers (the server resumes already-received chunks on the next
 * attempt, per apps.uploads), so a beforeunload guard warns first.
 */
export function UploadManagerProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [items, setItems] = useState<UploadItem[]>([]);

  // Refs mirror state for the sequential runner, which reads/advances outside
  // React's render cycle. `itemsRef` is the runner's source of truth;
  // `controllers` holds each in-flight AbortController; `queueRef` is the FIFO
  // of not-yet-started ids.
  const itemsRef = useRef(new Map<string, UploadItem>());
  const controllers = useRef(new Map<string, AbortController>());
  const queueRef = useRef<string[]>([]);
  const drainingRef = useRef(false);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const patch = useCallback((id: string, partial: Partial<UploadItem>) => {
    const current = itemsRef.current.get(id);
    if (current) itemsRef.current.set(id, { ...current, ...partial });
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...partial } : it)));
  }, []);

  const invalidateManuscript = useCallback(
    (historicalItemId: number) => {
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
      });
    },
    [queryClient]
  );

  const drain = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    let created = 0;
    try {
      while (queueRef.current.length > 0) {
        const id = queueRef.current.shift()!;
        const item = itemsRef.current.get(id);
        if (!item || item.status === 'canceled') continue;

        const authToken = tokenRef.current;
        if (!authToken) {
          patch(id, { status: 'error', error: 'Not authenticated.' });
          continue;
        }

        const controller = new AbortController();
        controllers.current.set(id, controller);
        patch(id, { status: 'uploading', phase: 'creating', error: '', sentBytes: 0 });

        try {
          await uploadImageFile(
            authToken,
            item.file,
            { item_part: item.itemPartId, locus: item.locus.trim(), tags: item.tags.trim() },
            {
              signal: controller.signal,
              onProgress: (p) =>
                patch(id, {
                  status: p.phase === 'processing' ? 'processing' : 'uploading',
                  phase: p.phase,
                  sentBytes: p.sentBytes,
                  message: p.message ?? '',
                }),
            }
          );
          patch(id, { status: 'done', phase: 'complete', message: '' });
          created++;
          invalidateManuscript(item.historicalItemId);
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            patch(id, { status: 'canceled' });
          } else if (isConflictError(err)) {
            // A duplicate proves the image already exists server-side — refresh
            // the manuscript so its thumbnail shows.
            patch(id, { status: 'duplicate', error: describeUploadError(err) });
            invalidateManuscript(item.historicalItemId);
          } else {
            const message = describeUploadError(err);
            patch(id, { status: 'error', error: message });
            // The tray shows successes/duplicates; only failures need to chase
            // the user (who may have navigated away).
            toast.error(`Upload failed: ${item.file.name}`, { description: message });
          }
        } finally {
          controllers.current.delete(id);
        }
      }
      if (created > 0) {
        // Search is refreshed manually in this system (see the search-engine
        // page, which flags out-of-sync segments). Nudge once per batch so a
        // newly uploaded image isn't silently missing from search.
        toast.info(
          `${created} image${created === 1 ? '' : 's'} uploaded — not searchable until reindex`,
          {
            description: 'Reindex Item Images / Item Parts to include them in search.',
            action: {
              label: 'Open Search Engine',
              onClick: () => router.push('/backoffice/search-engine'),
            },
          }
        );
      }
    } finally {
      drainingRef.current = false;
    }
  }, [patch, invalidateManuscript, router]);

  const enqueue = useCallback(
    (files: EnqueueFile[], target: EnqueueTarget) => {
      if (files.length === 0) return;
      const newItems: UploadItem[] = files.map((f) => ({
        id: crypto.randomUUID(),
        file: f.file,
        itemPartId: target.itemPartId,
        itemPartLabel: target.itemPartLabel,
        historicalItemId: target.historicalItemId,
        locus: f.locus,
        tags: f.tags,
        status: 'pending',
        phase: null,
        sentBytes: 0,
        totalBytes: f.file.size,
        message: '',
        error: '',
      }));
      for (const it of newItems) itemsRef.current.set(it.id, it);
      queueRef.current.push(...newItems.map((it) => it.id));
      setItems((prev) => [...prev, ...newItems]);
      void drain();
    },
    [drain]
  );

  const cancel = useCallback(
    (id: string) => {
      const controller = controllers.current.get(id);
      if (controller) controller.abort();
      // Not yet started: mark canceled so the runner skips it when reached.
      else patch(id, { status: 'canceled' });
    },
    [patch]
  );

  const retry = useCallback(
    (id: string) => {
      const item = itemsRef.current.get(id);
      // Only failed/canceled, still-in-memory items can be retried. (After a
      // full reload the item is gone entirely — the File can't be recovered.)
      if (!item || (item.status !== 'error' && item.status !== 'canceled')) return;
      patch(id, { status: 'pending', phase: null, sentBytes: 0, message: '', error: '' });
      queueRef.current.push(id);
      void drain();
    },
    [patch, drain]
  );

  const dismiss = useCallback((id: string) => {
    itemsRef.current.delete(id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clearFinished = useCallback(() => {
    setItems((prev) => {
      for (const it of prev) {
        if (UPLOAD_TERMINAL_STATUSES.includes(it.status)) itemsRef.current.delete(it.id);
      }
      return prev.filter((it) => !UPLOAD_TERMINAL_STATUSES.includes(it.status));
    });
  }, []);

  const activeCount = items.filter((it) => !UPLOAD_TERMINAL_STATUSES.includes(it.status)).length;

  // Warn before a reload/close drops in-flight transfers.
  useEffect(() => {
    if (activeCount === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [activeCount]);

  const value = useMemo(
    () => ({ items, activeCount, enqueue, cancel, retry, dismiss, clearFinished }),
    [items, activeCount, enqueue, cancel, retry, dismiss, clearFinished]
  );

  return <UploadManagerContext.Provider value={value}>{children}</UploadManagerContext.Provider>;
}

export function useUploadManager(): UploadManagerValue {
  const ctx = useContext(UploadManagerContext);
  if (!ctx) throw new Error('useUploadManager must be used within an UploadManagerProvider.');
  return ctx;
}
