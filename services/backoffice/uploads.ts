import { backofficeGet, backofficePost, BackofficeApiError } from './api-client';
import { API_BASE_URL } from '@/lib/api-fetch';
import { planChunks } from '@/lib/backoffice/upload-helpers';

/* ------------------------------------------------------------------ */
/*  Types (mirror apps/uploads serializer)                             */
/* ------------------------------------------------------------------ */

export type UploadSessionStatus =
  'pending' | 'uploading' | 'assembled' | 'processing' | 'complete' | 'failed';

export interface UploadTaskStatus {
  task_id: string;
  state: string;
  progress: {
    current: number;
    total: number;
    message: string;
    index_done: number;
    index_total: number;
  } | null;
  result: Record<string, unknown> | null;
  error: string | null;
}

export interface UploadSession {
  id: string;
  status: UploadSessionStatus;
  error: string;
  item_part: number;
  original_filename: string;
  declared_size: number;
  chunk_size: number;
  total_chunks: number;
  received_chunks: number[];
  missing_chunks: number[];
  destination_path: string;
  subfolder: string;
  locus: string;
  tags: string;
  item_image: number | null;
  task_id: string;
  task: UploadTaskStatus | null;
}

export interface CreateUploadSessionInput {
  item_part: number;
  filename: string;
  size: number;
  sha256?: string;
  locus?: string;
  tags?: string;
  subfolder?: string;
}

const BASE = '/api/v1/uploads/sessions/';

/* ------------------------------------------------------------------ */
/*  Session endpoints                                                  */
/* ------------------------------------------------------------------ */

export function createUploadSession(
  token: string,
  input: CreateUploadSessionInput
): Promise<UploadSession> {
  return backofficePost<UploadSession>(BASE, token, input);
}

export function getUploadSession(token: string, id: string): Promise<UploadSession> {
  // no-store: polling must see the worker's latest status, never a cached body.
  return backofficeGet<UploadSession>(`${BASE}${id}/`, token, { cache: 'no-store' });
}

export function finalizeUploadSession(token: string, id: string): Promise<UploadSession> {
  return backofficePost<UploadSession>(`${BASE}${id}/finalize/`, token, {});
}

/* ------------------------------------------------------------------ */
/*  Chunk transport (XHR — fetch cannot report upload progress)        */
/* ------------------------------------------------------------------ */

export class ChunkUploadError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(`Chunk upload failed (${status}): ${detail}`);
    this.name = 'ChunkUploadError';
  }
}

function putChunk(
  token: string,
  sessionId: string,
  index: number,
  blob: Blob,
  onProgress: (loadedInChunk: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `${API_BASE_URL}${BASE}${sessionId}/chunks/${index}/`);
    xhr.setRequestHeader('Authorization', `Token ${token}`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');

    const onAbort = () => xhr.abort();
    signal?.addEventListener('abort', onAbort);
    const cleanup = () => signal?.removeEventListener('abort', onAbort);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded);
    };
    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        let detail = xhr.responseText;
        try {
          detail = JSON.parse(xhr.responseText).detail ?? detail;
        } catch {
          /* keep raw text */
        }
        reject(new ChunkUploadError(xhr.status, detail));
      }
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error('Network error while uploading chunk.'));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    xhr.send(blob);
  });
}

/* ------------------------------------------------------------------ */
/*  High-level orchestrator                                            */
/* ------------------------------------------------------------------ */

export type UploadPhase =
  'creating' | 'uploading' | 'finalizing' | 'processing' | 'complete' | 'failed';

export interface UploadProgress {
  phase: UploadPhase;
  sentBytes: number;
  totalBytes: number;
  message?: string;
  session?: UploadSession;
}

export interface UploadImageOptions {
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
  /** Poll interval (ms) while the server converts the upload. */
  pollIntervalMs?: number;
  /** Max time (ms) to wait for server-side processing before giving up. */
  processTimeoutMs?: number;
}

export class UploadFailedError extends Error {
  constructor(
    message: string,
    public session: UploadSession
  ) {
    super(message);
    this.name = 'UploadFailedError';
  }
}

/** HTTP status behind an upload error, or null if it wasn't an HTTP error. */
export function uploadErrorStatus(err: unknown): number | null {
  if (err instanceof BackofficeApiError) return err.status;
  if (err instanceof ChunkUploadError) return err.status;
  return null;
}

/** Machine-readable error code from the backend body ('' when absent). */
export function uploadErrorCode(err: unknown): string {
  if (err instanceof BackofficeApiError) {
    const code = err.body?.code;
    return typeof code === 'string' ? code : '';
  }
  return '';
}

/**
 * True only for a REAL duplicate (file on disk / ItemImage row). Other 409s —
 * e.g. someone else's in-flight session holding the destination — must not be
 * presented as "already present". (Your own interrupted session never 409s:
 * the backend hands it back for resumption.)
 */
export function isConflictError(err: unknown): boolean {
  return uploadErrorStatus(err) === 409 && uploadErrorCode(err) === 'destination_exists';
}

/**
 * Human-readable reason for an upload failure. Prefers the backend's `detail`
 * string (e.g. "A file already exists at '…'. Uploads never overwrite.") over
 * the generic "API error 409" that BackofficeApiError.message carries.
 */
export function describeUploadError(err: unknown): string {
  if (err instanceof BackofficeApiError) {
    const detail = err.body?.detail;
    return typeof detail === 'string' && detail ? detail : `Request failed (${err.status}).`;
  }
  if (err instanceof ChunkUploadError) return err.detail || err.message;
  if (err instanceof UploadFailedError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Upload failed.';
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Drive one file through the whole pipeline: create session → upload the
 * missing chunks (resumable) → finalize → poll until the server-side
 * conversion reaches a terminal state. Reports byte- and phase-level progress
 * via `onProgress`. Throws `UploadFailedError` if the server marks the session
 * failed, `DOMException('AbortError')` if cancelled.
 */
export async function uploadImageFile(
  token: string,
  file: File,
  meta: { item_part: number; locus?: string; tags?: string; subfolder?: string },
  options: UploadImageOptions = {}
): Promise<UploadSession> {
  const { onProgress, signal, pollIntervalMs = 2000, processTimeoutMs = 30 * 60 * 1000 } = options;
  const total = file.size;
  const report = (progress: Omit<UploadProgress, 'totalBytes'>) =>
    onProgress?.({ totalBytes: total, ...progress });

  report({ phase: 'creating', sentBytes: 0 });
  // sha256 is intentionally omitted: hashing multi-GB files on the main
  // thread would freeze the UI, and the server verifies byte-count on every
  // finalize plus exact per-chunk sizes, which catches truncation/corruption.
  let session = await createUploadSession(token, {
    item_part: meta.item_part,
    filename: file.name,
    size: file.size,
    locus: meta.locus,
    tags: meta.tags,
    subfolder: meta.subfolder,
  });

  const plan = planChunks(total, session.chunk_size);
  const missing = new Set(session.missing_chunks);
  // Bytes already accepted server-side (0 for a fresh session; non-zero only
  // when resuming a session whose id was reused). Anchors the progress bar.
  let sentBytes = plan.reduce((acc, c) => (missing.has(c.index) ? acc : acc + c.size), 0);

  for (const chunk of plan) {
    if (!missing.has(chunk.index)) continue;
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const base = sentBytes;
    await putChunk(
      token,
      session.id,
      chunk.index,
      file.slice(chunk.start, chunk.end),
      (loadedInChunk) => report({ phase: 'uploading', sentBytes: base + loadedInChunk }),
      signal
    );
    sentBytes = base + chunk.size;
    report({ phase: 'uploading', sentBytes });
  }

  report({ phase: 'finalizing', sentBytes: total });
  session = await finalizeUploadSession(token, session.id);

  const deadline = Date.now() + processTimeoutMs;
  while (session.status !== 'complete' && session.status !== 'failed') {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (Date.now() > deadline) {
      throw new UploadFailedError('Timed out waiting for server-side processing.', session);
    }
    await sleep(pollIntervalMs);
    session = await getUploadSession(token, session.id);
    report({
      phase: 'processing',
      sentBytes: total,
      message: session.task?.progress?.message,
      session,
    });
  }

  if (session.status === 'failed') {
    throw new UploadFailedError(session.error || 'Upload processing failed.', session);
  }
  report({ phase: 'complete', sentBytes: total, session });
  return session;
}

export { BackofficeApiError };
