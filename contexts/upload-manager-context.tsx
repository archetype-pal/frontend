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
  findActiveDuplicate,
  findSessionRival,
  getUploadTabId,
  listUploadBreadcrumbs,
  matchFilesToUploadBreadcrumbs,
  partitionUploadBreadcrumbs,
  removeUploadBreadcrumbs,
  saveUploadBreadcrumb,
  touchUploadBreadcrumbs,
  updateUploadBreadcrumb,
  UPLOAD_BREADCRUMBS_STORAGE_KEY,
  type UploadBreadcrumb,
} from '@/lib/backoffice/upload-breadcrumbs';
import {
  describeUploadError,
  getUploadSession,
  isConflictError,
  uploadImageFile,
  watchUploadSession,
  type UploadPhase,
  type UploadSession,
} from '@/services/backoffice/uploads';

export type UploadItemStatus =
  'pending' | 'uploading' | 'processing' | 'done' | 'error' | 'duplicate' | 'canceled' | 'busy';

export interface UploadItem {
  id: string;
  /** The staged File. Absent for an item recovered after a reload — a browser
   *  cannot re-read a File across reloads, so a recovered item either watches
   *  the server-side conversion or waits for the user to re-select. */
  file?: File;
  fileName: string;
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

export interface ResumeResult {
  resumed: number;
  /** Names of picked files that matched no interrupted upload. */
  unmatched: string[];
}

interface UploadManagerValue {
  items: UploadItem[];
  activeCount: number;
  /** Uploads interrupted by a reload/crash that need their file re-selected
   *  (recovered from localStorage breadcrumbs; the File itself cannot survive
   *  a reload, only its description can). */
  interrupted: UploadBreadcrumb[];
  enqueue: (files: EnqueueFile[], target: EnqueueTarget) => void;
  cancel: (id: string) => void;
  /** Re-run a failed/canceled item. Works only while the tab is open (the
   *  File is still in memory); the server resume then re-sends just the
   *  chunks it hasn't already received. */
  retry: (id: string) => void;
  dismiss: (id: string) => void;
  clearFinished: () => void;
  /** Pair re-selected files with interrupted uploads by (name, size) and
   *  re-enqueue the matches with their saved target/locus/tags; the server
   *  resumes from the chunks it already holds. */
  resumeInterrupted: (files: File[]) => ResumeResult;
  dismissInterrupted: (id: string) => void;
}

export const UPLOAD_TERMINAL_STATUSES: UploadItemStatus[] = [
  'done',
  'error',
  'duplicate',
  'canceled',
  'busy',
];

export const RETRYABLE_STATUSES: UploadItemStatus[] = ['error', 'canceled'];

/** Shown when a live sibling tab already owns this file's upload. Deliberately
 *  no take-over affordance ('busy' is not retryable): once the other tab's
 *  upload finishes or is stopped, a fresh "Add images" simply works — the
 *  ownership check only counts crumbs that are actively uploading. */
const BUSY_IN_OTHER_TAB = 'Already uploading in another tab — track it there.';

/** Breadcrumb heartbeat cadence. Must stay well inside
 *  UPLOAD_BREADCRUMB_STALE_MS so live crumbs never look orphaned to other tabs. */
const HEARTBEAT_MS = 20_000;
/** How often to re-scan storage for crumbs orphaned by a dead sibling tab. */
const RESCAN_MS = 30_000;

const UploadManagerContext = createContext<UploadManagerValue | null>(null);

/** Breadcrumb describing a live tray item, for enqueue and retry (upsert). */
function crumbFromItem(item: UploadItem, tabId: string, now: number): UploadBreadcrumb {
  return {
    id: item.id,
    fileName: item.fileName,
    fileSize: item.totalBytes,
    itemPartId: item.itemPartId,
    itemPartLabel: item.itemPartLabel,
    historicalItemId: item.historicalItemId,
    locus: item.locus,
    tags: item.tags,
    sessionId: '',
    status: 'pending',
    tabId,
    createdAt: now,
    updatedAt: now,
  };
}

/** Tray item reconstructed from a breadcrumb (recovery paths have no File). */
function itemFromCrumb(crumb: UploadBreadcrumb, over: Partial<UploadItem>): UploadItem {
  return {
    id: crumb.id,
    fileName: crumb.fileName,
    itemPartId: crumb.itemPartId,
    itemPartLabel: crumb.itemPartLabel,
    historicalItemId: crumb.historicalItemId,
    locus: crumb.locus,
    tags: crumb.tags,
    status: 'pending',
    phase: null,
    sentBytes: 0,
    totalBytes: crumb.fileSize,
    message: '',
    error: '',
    ...over,
  };
}

/**
 * Owns image uploads for the whole backoffice. Mounted once in BackofficeShell
 * so uploads keep running (and stay visible in the tray) as the user navigates
 * between backoffice pages — a modal can't do that because it unmounts on
 * close. Reuses the `uploadImageFile` orchestrator unchanged; this layer only
 * adds a queue, cross-navigation lifetime, and per-manuscript cache
 * invalidation.
 *
 * Uploads run sequentially (one server-side Celery worker; avoids bandwidth
 * contention on large scans). The queue is in-memory, but every unfinished
 * item leaves a localStorage breadcrumb (lib/backoffice/upload-breadcrumbs).
 * A reload still interrupts the transfer — the File cannot be re-read across
 * reloads, so beforeunload warns first — but afterwards the breadcrumbs come
 * back: a finalized upload re-attaches to the server-side conversion
 * automatically, and an unfinished transfer becomes a re-select prompt whose
 * resume skips the chunks the server already received.
 */
export function UploadManagerProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [interrupted, setInterrupted] = useState<UploadBreadcrumb[]>([]);

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
  const interruptedRef = useRef(interrupted);
  interruptedRef.current = interrupted;
  // Recovery bookkeeping: `scanningRef` serializes scans; `promptOnlyRef`
  // remembers session-crumbs already routed to "needs re-select" so rescans
  // don't re-fetch them; `watchStatsRef` batches the reindex nudge across
  // concurrent re-attached watches.
  const scanningRef = useRef(false);
  const promptOnlyRef = useRef(new Set<string>());
  const watchStatsRef = useRef({ outstanding: 0, completed: 0 });

  const patch = useCallback((id: string, partial: Partial<UploadItem>) => {
    const current = itemsRef.current.get(id);
    if (current) itemsRef.current.set(id, { ...current, ...partial });
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...partial } : it)));
  }, []);

  const addItem = useCallback((item: UploadItem) => {
    itemsRef.current.set(item.id, item);
    setItems((prev) => [...prev, item]);
  }, []);

  const invalidateManuscript = useCallback(
    (historicalItemId: number) => {
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
      });
    },
    [queryClient]
  );

  // Search is refreshed manually in this system (see the search-engine page,
  // which flags out-of-sync segments). Nudge once per batch so a newly
  // uploaded image isn't silently missing from search.
  const showReindexNudge = useCallback(
    (created: number) => {
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
    },
    [router]
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
        // Recovered watch items never enqueue; this guard is for the compiler.
        if (!item.file) continue;

        const authToken = tokenRef.current;
        if (!authToken) {
          patch(id, { status: 'error', error: 'Not authenticated.' });
          updateUploadBreadcrumb(id, { status: 'error' });
          continue;
        }

        // Cross-tab ownership: a live sibling tab already uploading the same
        // file to the same part would be handed the SAME server session —
        // don't compete with it, park this item as busy (Retry = take over).
        const duplicate = findActiveDuplicate(
          listUploadBreadcrumbs(),
          { id, fileName: item.fileName, fileSize: item.totalBytes, itemPartId: item.itemPartId },
          getUploadTabId(),
          Date.now()
        );
        if (duplicate) {
          patch(id, { status: 'busy', error: BUSY_IN_OTHER_TAB });
          removeUploadBreadcrumbs([id]); // don't shadow the owner's crumb
          continue;
        }

        const controller = new AbortController();
        controllers.current.set(id, controller);
        patch(id, { status: 'uploading', phase: 'creating', error: '', sentBytes: 0 });
        updateUploadBreadcrumb(id, { status: 'uploading' });
        // Written once per item: recovery uses the session id to ask the
        // server for the truth instead of guessing from the crumb.
        let crumbSessionId = '';
        let yieldedToRival = false;

        try {
          await uploadImageFile(
            authToken,
            item.file,
            { item_part: item.itemPartId, locus: item.locus.trim(), tags: item.tags.trim() },
            {
              signal: controller.signal,
              onProgress: (p) => {
                patch(id, {
                  status: p.phase === 'processing' ? 'processing' : 'uploading',
                  phase: p.phase,
                  sentBytes: p.sentBytes,
                  message: p.message ?? '',
                });
                if (p.session && p.session.id !== crumbSessionId) {
                  crumbSessionId = p.session.id;
                  updateUploadBreadcrumb(id, { sessionId: crumbSessionId });
                  // Near-simultaneous start in two tabs slips past the
                  // duplicate check; both then hold the same session. The
                  // deterministically-younger crumb yields (see findSessionRival).
                  const all = listUploadBreadcrumbs();
                  const ours = all.find((c) => c.id === id);
                  if (ours && findSessionRival(ours, all, Date.now())) {
                    yieldedToRival = true;
                    controller.abort();
                  }
                }
              },
            }
          );
          patch(id, { status: 'done', phase: 'complete', message: '' });
          removeUploadBreadcrumbs([id]);
          created++;
          invalidateManuscript(item.historicalItemId);
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            if (yieldedToRival) {
              patch(id, { status: 'busy', error: BUSY_IN_OTHER_TAB });
              removeUploadBreadcrumbs([id]);
            } else {
              patch(id, { status: 'canceled' });
              updateUploadBreadcrumb(id, { status: 'canceled' });
            }
          } else if (isConflictError(err)) {
            // A duplicate proves the image already exists server-side — refresh
            // the manuscript so its thumbnail shows.
            patch(id, { status: 'duplicate', error: describeUploadError(err) });
            removeUploadBreadcrumbs([id]);
            invalidateManuscript(item.historicalItemId);
          } else {
            const message = describeUploadError(err);
            patch(id, { status: 'error', error: message });
            updateUploadBreadcrumb(id, { status: 'error' });
            // The tray shows successes/duplicates; only failures need to chase
            // the user (who may have navigated away).
            toast.error(`Upload failed: ${item.fileName}`, { description: message });
          }
        } finally {
          controllers.current.delete(id);
        }
      }
      if (created > 0) showReindexNudge(created);
    } finally {
      drainingRef.current = false;
    }
  }, [patch, invalidateManuscript, showReindexNudge]);

  const enqueue = useCallback(
    (files: EnqueueFile[], target: EnqueueTarget) => {
      if (files.length === 0) return;
      const now = Date.now();
      const tabId = getUploadTabId();
      const newItems: UploadItem[] = files.map((f) => ({
        id: crypto.randomUUID(),
        file: f.file,
        fileName: f.file.name,
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
      for (const it of newItems) {
        itemsRef.current.set(it.id, it);
        saveUploadBreadcrumb(crumbFromItem(it, tabId, now));
      }
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
      else {
        patch(id, { status: 'canceled' });
        updateUploadBreadcrumb(id, { status: 'canceled' });
      }
    },
    [patch]
  );

  const retry = useCallback(
    (id: string) => {
      const item = itemsRef.current.get(id);
      // Only failed/canceled items whose File is still in memory can be
      // retried; a recovered watch item has no File — nothing to resend.
      if (!item || !item.file || !RETRYABLE_STATUSES.includes(item.status)) return;
      patch(id, { status: 'pending', phase: null, sentBytes: 0, message: '', error: '' });
      // Upsert, not update: the crumb may have been evicted meanwhile.
      saveUploadBreadcrumb(crumbFromItem(item, getUploadTabId(), Date.now()));
      queueRef.current.push(id);
      void drain();
    },
    [patch, drain]
  );

  const dismiss = useCallback((id: string) => {
    itemsRef.current.delete(id);
    removeUploadBreadcrumbs([id]);
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clearFinished = useCallback(() => {
    const finished = [...itemsRef.current.values()].filter((it) =>
      UPLOAD_TERMINAL_STATUSES.includes(it.status)
    );
    for (const it of finished) itemsRef.current.delete(it.id);
    removeUploadBreadcrumbs(finished.map((it) => it.id));
    setItems((prev) => prev.filter((it) => !UPLOAD_TERMINAL_STATUSES.includes(it.status)));
  }, []);

  /** Re-attach to a finalized upload whose conversion is still running
   *  server-side. No File is needed — every byte is already on the server —
   *  so this survives the reload that killed the original tray item. */
  const startWatch = useCallback(
    (crumb: UploadBreadcrumb, session: UploadSession) => {
      addItem(
        itemFromCrumb(crumb, {
          status: 'processing',
          phase: 'processing',
          sentBytes: crumb.fileSize,
          message: session.task?.progress?.message ?? '',
        })
      );
      // Claim the crumb for this tab so sibling tabs stop seeing it as orphaned.
      updateUploadBreadcrumb(crumb.id, {
        status: 'processing',
        sessionId: session.id,
        tabId: getUploadTabId(),
      });
      const controller = new AbortController();
      controllers.current.set(crumb.id, controller);
      watchStatsRef.current.outstanding++;
      void (async () => {
        try {
          await watchUploadSession(tokenRef.current ?? '', session, {
            signal: controller.signal,
            onProgress: (p) => patch(crumb.id, { message: p.message ?? '' }),
          });
          patch(crumb.id, { status: 'done', phase: 'complete', message: '' });
          removeUploadBreadcrumbs([crumb.id]);
          watchStatsRef.current.completed++;
          invalidateManuscript(crumb.historicalItemId);
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            // "Cancel" here only stops tracking — the server-side conversion
            // runs on regardless, so drop the crumb rather than re-adopt it.
            patch(crumb.id, { status: 'canceled' });
            removeUploadBreadcrumbs([crumb.id]);
          } else {
            // Keep the crumb: a poll hiccup isn't a verdict. The next scan or
            // reload re-reads the session and settles it properly.
            const message = describeUploadError(err);
            patch(crumb.id, { status: 'error', error: message });
            toast.error(`Upload failed: ${crumb.fileName}`, { description: message });
          }
        } finally {
          controllers.current.delete(crumb.id);
          const stats = watchStatsRef.current;
          stats.outstanding--;
          if (stats.outstanding === 0 && stats.completed > 0) {
            showReindexNudge(stats.completed);
            stats.completed = 0;
          }
        }
      })();
    },
    [addItem, patch, invalidateManuscript, showReindexNudge]
  );

  /** Route an adopted crumb by the server's view of its session: 'complete' →
   *  the row exists, just refresh; 'watch' → re-attach to the conversion;
   *  'prompt' → chunks are missing, only the user can supply the File again.
   *  Any lookup failure degrades to 'prompt' — re-selecting is safe in every
   *  state, because the server's create-or-resume sorts it out. */
  const routeSessionCrumb = useCallback(
    async (
      authToken: string,
      crumb: UploadBreadcrumb
    ): Promise<'handled' | 'complete' | 'prompt'> => {
      let session: UploadSession;
      try {
        session = await getUploadSession(authToken, crumb.sessionId);
      } catch {
        return 'prompt';
      }
      if (session.status === 'complete') {
        removeUploadBreadcrumbs([crumb.id]);
        addItem(
          itemFromCrumb(crumb, {
            status: 'done',
            phase: 'complete',
            sentBytes: crumb.fileSize,
          })
        );
        invalidateManuscript(crumb.historicalItemId);
        return 'complete';
      }
      if (session.status === 'failed') {
        removeUploadBreadcrumbs([crumb.id]);
        addItem(
          itemFromCrumb(crumb, {
            status: 'error',
            phase: 'failed',
            error: session.error || 'Upload processing failed.',
          })
        );
        return 'handled';
      }
      if (session.status === 'processing' || session.status === 'assembled') {
        startWatch(crumb, session);
        return 'handled';
      }
      return 'prompt'; // pending | uploading — chunks incomplete
    },
    [addItem, invalidateManuscript, startWatch]
  );

  /** Recover breadcrumbs after a reload (or from a dead sibling tab): route
   *  session-backed crumbs by live server state, everything else into the
   *  re-select prompt list. `interrupted` is recomputed wholesale each scan so
   *  rows vanish when another tab claims or finishes them. */
  const scanBreadcrumbs = useCallback(async () => {
    if (scanningRef.current) return;
    const authToken = tokenRef.current;
    if (!authToken) return;
    scanningRef.current = true;
    try {
      const { adoptable, expired } = partitionUploadBreadcrumbs(
        listUploadBreadcrumbs(),
        getUploadTabId(),
        Date.now()
      );
      if (expired.length > 0) removeUploadBreadcrumbs(expired.map((c) => c.id));

      const prompts: UploadBreadcrumb[] = [];
      let completed = 0;
      for (const crumb of adoptable) {
        if (itemsRef.current.has(crumb.id)) continue; // already live in this tab
        if (!crumb.sessionId || promptOnlyRef.current.has(crumb.id)) {
          prompts.push(crumb);
          continue;
        }
        const outcome = await routeSessionCrumb(authToken, crumb);
        if (outcome === 'complete') completed++;
        else if (outcome === 'prompt') {
          promptOnlyRef.current.add(crumb.id);
          prompts.push(crumb);
        }
      }
      // Keep the previous array identity when nothing changed: rescans run on
      // an interval, and a fresh-but-equal array would re-render every
      // consumer (and can feed render→effect→scan loops in test harnesses).
      setInterrupted((prev) =>
        prev.length === prompts.length &&
        prev.every((c, i) => c.id === prompts[i].id && c.updatedAt === prompts[i].updatedAt)
          ? prev
          : prompts
      );
      if (completed > 0) showReindexNudge(completed);
    } finally {
      scanningRef.current = false;
    }
  }, [routeSessionCrumb, showReindexNudge]);

  const resumeInterrupted = useCallback(
    (files: File[]): ResumeResult => {
      const { matches, unmatched } = matchFilesToUploadBreadcrumbs(files, interruptedRef.current);
      if (matches.length > 0) {
        const resumedIds = new Set(matches.map((m) => m.breadcrumb.id));
        for (const { breadcrumb, file } of matches) {
          promptOnlyRef.current.delete(breadcrumb.id);
          // Claim + reset: the queue runner drives it like a fresh enqueue;
          // the server-side create-or-resume skips chunks it already holds.
          updateUploadBreadcrumb(breadcrumb.id, { status: 'pending', tabId: getUploadTabId() });
          addItem(itemFromCrumb(breadcrumb, { file }));
          queueRef.current.push(breadcrumb.id);
        }
        setInterrupted((prev) => prev.filter((c) => !resumedIds.has(c.id)));
        void drain();
      }
      return { resumed: matches.length, unmatched: unmatched.map((f) => f.name) };
    },
    [addItem, drain]
  );

  const dismissInterrupted = useCallback((id: string) => {
    removeUploadBreadcrumbs([id]);
    promptOnlyRef.current.delete(id);
    setInterrupted((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const activeCount = items.filter((it) => !UPLOAD_TERMINAL_STATUSES.includes(it.status)).length;

  // Warn before a reload/close drops in-flight transfers. Breadcrumbs make
  // the loss recoverable, but resuming still costs a re-select — warn anyway.
  useEffect(() => {
    if (activeCount === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [activeCount]);

  // Recover interrupted uploads once authenticated; re-scan periodically and
  // on cross-tab storage changes so crumbs orphaned by a dead sibling tab get
  // picked up and rows claimed elsewhere disappear.
  useEffect(() => {
    if (!token) return;
    void scanBreadcrumbs();
    const interval = window.setInterval(() => void scanBreadcrumbs(), RESCAN_MS);
    const onStorage = (e: StorageEvent) => {
      if (e.key === UPLOAD_BREADCRUMBS_STORAGE_KEY) void scanBreadcrumbs();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [token, scanBreadcrumbs]);

  // Heartbeat the crumbs of live items so sibling tabs don't adopt them.
  useEffect(() => {
    if (activeCount === 0) return;
    const interval = window.setInterval(() => {
      const ids = [...itemsRef.current.values()]
        .filter((it) => !UPLOAD_TERMINAL_STATUSES.includes(it.status))
        .map((it) => it.id);
      if (ids.length > 0) touchUploadBreadcrumbs(ids);
    }, HEARTBEAT_MS);
    return () => window.clearInterval(interval);
  }, [activeCount]);

  const value = useMemo(
    () => ({
      items,
      activeCount,
      interrupted,
      enqueue,
      cancel,
      retry,
      dismiss,
      clearFinished,
      resumeInterrupted,
      dismissInterrupted,
    }),
    [
      items,
      activeCount,
      interrupted,
      enqueue,
      cancel,
      retry,
      dismiss,
      clearFinished,
      resumeInterrupted,
      dismissInterrupted,
    ]
  );

  return <UploadManagerContext.Provider value={value}>{children}</UploadManagerContext.Provider>;
}

export function useUploadManager(): UploadManagerValue {
  const ctx = useContext(UploadManagerContext);
  if (!ctx) throw new Error('useUploadManager must be used within an UploadManagerProvider.');
  return ctx;
}
