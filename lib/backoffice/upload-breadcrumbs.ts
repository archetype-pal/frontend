/**
 * localStorage breadcrumbs for in-flight image uploads.
 *
 * The upload queue itself is in-memory (contexts/upload-manager-context), and
 * a browser cannot re-read a `File` across a reload — so a reload mid-transfer
 * used to lose the upload silently. Each unfinished upload now leaves a
 * breadcrumb here describing what was being uploaded and where. After a
 * reload, the manager reads them back: a finalized upload re-attaches to the
 * server-side conversion (no File needed — the bytes are all server-side),
 * while an unfinished transfer becomes a "re-add the file to resume" prompt.
 * On re-select, the server's create-or-resume endpoint skips the chunks it
 * already received.
 *
 * Multi-tab protocol: localStorage is shared across tabs, so a breadcrumb must
 * not be "recovered" by tab B while tab A is still uploading it. Each tab gets
 * a stable id from sessionStorage (survives reload, unique per tab), stamps it
 * on its breadcrumbs, and heartbeats `updatedAt` while the item is live. A
 * crumb is adoptable when it carries our own tab id (only a dead predecessor
 * of this very tab can have written it) or when a foreign crumb's heartbeat
 * has gone stale (its tab is gone).
 *
 * Everything here is best-effort: storage failures (private mode, quota) are
 * swallowed — breadcrumbs improve recovery, they never gate an upload.
 */

export type UploadBreadcrumbStatus = 'pending' | 'uploading' | 'processing' | 'error' | 'canceled';

export interface UploadBreadcrumb {
  /** Same id as the tray's UploadItem, so the two stay one namespace. */
  id: string;
  fileName: string;
  fileSize: number;
  itemPartId: number;
  itemPartLabel: string;
  historicalItemId: number;
  locus: string;
  tags: string;
  /** Server UploadSession id, '' until the session exists. With it, recovery
   *  can ask the server for the true state instead of guessing. */
  sessionId: string;
  status: UploadBreadcrumbStatus;
  tabId: string;
  /** ms epoch. */
  createdAt: number;
  /** ms epoch; heartbeat while the owning tab is alive. */
  updatedAt: number;
}

export const UPLOAD_BREADCRUMBS_STORAGE_KEY = 'backoffice-upload-breadcrumbs';
const TAB_ID_STORAGE_KEY = 'backoffice-upload-tab-id';

/** A foreign crumb whose heartbeat is older than this is orphaned (its tab is
 *  gone) and may be adopted. The manager heartbeats every ~20s, so this allows
 *  several missed beats before another tab moves in. */
export const UPLOAD_BREADCRUMB_STALE_MS = 90_000;

/** Crumbs older than this are dropped outright — matches the backend's
 *  `cleanup_stale_uploads` default, after which the session is reaped anyway. */
export const UPLOAD_BREADCRUMB_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const MAX_BREADCRUMBS = 50;

const STATUSES: readonly string[] = ['pending', 'uploading', 'processing', 'error', 'canceled'];

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isValidBreadcrumb(x: unknown): x is UploadBreadcrumb {
  if (typeof x !== 'object' || x === null) return false;
  const c = x as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    c.id !== '' &&
    typeof c.fileName === 'string' &&
    c.fileName !== '' &&
    typeof c.fileSize === 'number' &&
    c.fileSize > 0 &&
    typeof c.itemPartId === 'number' &&
    typeof c.itemPartLabel === 'string' &&
    typeof c.historicalItemId === 'number' &&
    typeof c.locus === 'string' &&
    typeof c.tags === 'string' &&
    typeof c.sessionId === 'string' &&
    typeof c.status === 'string' &&
    STATUSES.includes(c.status) &&
    typeof c.tabId === 'string' &&
    typeof c.createdAt === 'number' &&
    typeof c.updatedAt === 'number'
  );
}

export function listUploadBreadcrumbs(): UploadBreadcrumb[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(UPLOAD_BREADCRUMBS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidBreadcrumb);
  } catch {
    return [];
  }
}

function writeAll(crumbs: UploadBreadcrumb[]): void {
  if (!canUseStorage()) return;
  try {
    const bounded = [...crumbs].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_BREADCRUMBS);
    window.localStorage.setItem(UPLOAD_BREADCRUMBS_STORAGE_KEY, JSON.stringify(bounded));
  } catch {
    /* quota / private mode — breadcrumbs are best-effort */
  }
}

/** Insert or replace (by id). */
export function saveUploadBreadcrumb(crumb: UploadBreadcrumb): void {
  writeAll([...listUploadBreadcrumbs().filter((c) => c.id !== crumb.id), crumb]);
}

/** Patch an existing crumb; also bumps its heartbeat. Missing id is a no-op. */
export function updateUploadBreadcrumb(
  id: string,
  partial: Partial<Omit<UploadBreadcrumb, 'id'>>
): void {
  writeAll(
    listUploadBreadcrumbs().map((c) =>
      c.id === id ? { ...c, ...partial, updatedAt: Date.now() } : c
    )
  );
}

export function removeUploadBreadcrumbs(ids: string[]): void {
  if (ids.length === 0) return;
  const drop = new Set(ids);
  writeAll(listUploadBreadcrumbs().filter((c) => !drop.has(c.id)));
}

/** Heartbeat: bump `updatedAt` on the given crumbs so other tabs keep treating
 *  them as live. Never inserts. */
export function touchUploadBreadcrumbs(ids: string[]): void {
  if (ids.length === 0) return;
  const touch = new Set(ids);
  const now = Date.now();
  writeAll(listUploadBreadcrumbs().map((c) => (touch.has(c.id) ? { ...c, updatedAt: now } : c)));
}

/** Stable per-tab identity. sessionStorage survives a reload of the same tab
 *  but is never shared with other tabs — exactly the lifetime we need. */
export function getUploadTabId(): string {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') return '';
  try {
    let id = window.sessionStorage.getItem(TAB_ID_STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.sessionStorage.setItem(TAB_ID_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

export interface UploadBreadcrumbPartition {
  /** Safe to recover in this tab: ours (predecessor of this tab is dead by
   *  definition — we replaced it) or foreign with a stale heartbeat. */
  adoptable: UploadBreadcrumb[];
  /** A live tab is still driving these — leave them alone. */
  foreignActive: UploadBreadcrumb[];
  /** Older than the expiry window — delete. */
  expired: UploadBreadcrumb[];
}

export function partitionUploadBreadcrumbs(
  crumbs: UploadBreadcrumb[],
  tabId: string,
  now: number
): UploadBreadcrumbPartition {
  const out: UploadBreadcrumbPartition = { adoptable: [], foreignActive: [], expired: [] };
  for (const c of crumbs) {
    const age = now - c.updatedAt;
    if (age > UPLOAD_BREADCRUMB_EXPIRY_MS) out.expired.push(c);
    else if (c.tabId === tabId || age > UPLOAD_BREADCRUMB_STALE_MS) out.adoptable.push(c);
    else out.foreignActive.push(c);
  }
  return out;
}

export interface UploadBreadcrumbFileMatch {
  breadcrumb: UploadBreadcrumb;
  file: File;
}

/**
 * Pair re-selected files with interrupted uploads by exact (name, size) — the
 * same identity the server uses to resume a session, so a match here is a
 * match there. Strictness is deliberate: a renamed file would land on a
 * different destination path (a fresh upload, not a resume), and a
 * different-size file would be rejected by the session anyway. Each crumb is
 * consumed at most once; files matching nothing are reported back.
 */
export function matchFilesToUploadBreadcrumbs(
  files: File[],
  crumbs: UploadBreadcrumb[]
): { matches: UploadBreadcrumbFileMatch[]; unmatched: File[] } {
  const remaining = [...crumbs];
  const matches: UploadBreadcrumbFileMatch[] = [];
  const unmatched: File[] = [];
  for (const file of files) {
    const i = remaining.findIndex((c) => c.fileName === file.name && c.fileSize === file.size);
    if (i === -1) {
      unmatched.push(file);
    } else {
      matches.push({ breadcrumb: remaining[i], file });
      remaining.splice(i, 1);
    }
  }
  return { matches, unmatched };
}
