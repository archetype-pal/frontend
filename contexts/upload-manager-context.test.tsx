import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';

import {
  UploadManagerProvider,
  useUploadManager,
  type ResumeResult,
} from './upload-manager-context';
import {
  getUploadTabId,
  listUploadBreadcrumbs,
  saveUploadBreadcrumb,
  UPLOAD_BREADCRUMB_STALE_MS,
  UPLOAD_BREADCRUMBS_STORAGE_KEY,
  type UploadBreadcrumb,
} from '@/lib/backoffice/upload-breadcrumbs';
import {
  abortUploadSession,
  getUploadSession,
  uploadImageFile,
  BackofficeApiError,
  watchUploadSession,
  type UploadSession,
} from '@/services/backoffice/uploads';

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ token: 'tok', user: null, isReady: true, setToken: vi.fn(), logout: vi.fn() }),
}));

// The mock router must be render-stable like the real one: a fresh object per
// render would invalidate the provider's useCallback chain on every render.
const routerMock = vi.hoisted(() => ({ push: () => {} }));
vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { info: vi.fn(), error: vi.fn(), success: vi.fn() }),
}));

// Mock only the network orchestrators; error helpers etc. stay real.
vi.mock('@/services/backoffice/uploads', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/backoffice/uploads')>();
  return {
    ...actual,
    uploadImageFile: vi.fn(),
    getUploadSession: vi.fn(),
    watchUploadSession: vi.fn(),
    abortUploadSession: vi.fn(() => Promise.resolve()),
  };
});

const mockedUpload = vi.mocked(uploadImageFile);
const mockedGetSession = vi.mocked(getUploadSession);
const mockedWatch = vi.mocked(watchUploadSession);
const mockedAbort = vi.mocked(abortUploadSession);

const session = (over: Partial<UploadSession> = {}): UploadSession => ({
  id: 's1',
  status: 'processing',
  error: '',
  item_part: 3,
  original_filename: 'f12r.tif',
  declared_size: 5,
  chunk_size: 5,
  total_chunks: 1,
  received_chunks: [0],
  missing_chunks: [],
  destination_path: 'uploads/item-part-3/f12r.jp2',
  subfolder: '',
  locus: 'f.3r',
  tags: '',
  item_image: null,
  task_id: 't1',
  task: null,
  ...over,
});

/** Seed a breadcrumb as a dead previous incarnation of this tab would have
 *  left it (same sessionStorage tab id, heartbeat in the past). */
function seedCrumb(over: Partial<UploadBreadcrumb> = {}): void {
  const now = Date.now();
  saveUploadBreadcrumb({
    id: 'crumb-1',
    fileName: 'f12r.tif',
    fileSize: 5,
    itemPartId: 3,
    itemPartLabel: 'MS A, part 1',
    historicalItemId: 7,
    locus: 'f.3r',
    tags: 'recto',
    sessionId: '',
    status: 'uploading',
    tabId: getUploadTabId(),
    createdAt: now - 60_000,
    updatedAt: now - 60_000,
    ...over,
  });
}

const makeFile = (name: string, bytes: number) => new File(['x'.repeat(bytes)], name);

function Harness() {
  const { items, interrupted, enqueue, cancel, retry, resumeInterrupted, dismissInterrupted } =
    useUploadManager();
  const [resume, setResume] = useState<ResumeResult | null>(null);
  return (
    <div>
      <output data-testid="items">
        {items.map((it) => `${it.fileName}:${it.status}`).join(',')}
      </output>
      <output data-testid="itemErrors">{items.map((it) => it.error).join('|')}</output>
      <output data-testid="interrupted">{interrupted.map((c) => c.fileName).join(',')}</output>
      <output data-testid="resume-result">
        {resume ? `${resume.resumed}|${resume.unmatched.join(';')}` : ''}
      </output>
      <button
        type="button"
        onClick={() =>
          enqueue([{ file: makeFile('new.tif', 4), locus: 'f.1r', tags: '' }], {
            itemPartId: 3,
            itemPartLabel: 'MS A, part 1',
            historicalItemId: 7,
          })
        }
      >
        enqueue one
      </button>
      <button type="button" onClick={() => setResume(resumeInterrupted([makeFile('f12r.tif', 5)]))}>
        resume matching
      </button>
      <button
        type="button"
        onClick={() => setResume(resumeInterrupted([makeFile('other.tif', 9)]))}
      >
        resume mismatching
      </button>
      <button type="button" onClick={() => interrupted[0] && dismissInterrupted(interrupted[0].id)}>
        dismiss interrupted
      </button>
      <button type="button" onClick={() => items[0] && retry(items[0].id)}>
        retry first
      </button>
      <button type="button" onClick={() => items[0] && cancel(items[0].id)}>
        cancel first
      </button>
      <button
        type="button"
        onClick={() =>
          enqueue(
            ['a.tif', 'b.tif', 'c.tif'].map((n) => ({ file: makeFile(n, 4), locus: '', tags: '' })),
            { itemPartId: 3, itemPartLabel: 'MS A, part 1', historicalItemId: 7 }
          )
        }
      >
        enqueue three
      </button>
    </div>
  );
}

function renderHarness() {
  const queryClient = new QueryClient();
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <UploadManagerProvider>
        <Harness />
      </UploadManagerProvider>
    </QueryClientProvider>
  );
  return { ...utils, invalidateSpy };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  // `drain` reads the token from the cookie, not the auth context — that is
  // the only source that actually goes empty on logout. Signing in here makes
  // the harness match reality; the `useAuth` mock above only feeds the shell.
  document.cookie = 'archetype_auth_token=tok; Path=/';
  vi.clearAllMocks();
});

describe('recovery scan', () => {
  it('surfaces an own-tab crumb without a session as an interrupted prompt', async () => {
    seedCrumb();
    renderHarness();
    await waitFor(() =>
      expect(screen.getByTestId('interrupted').textContent).toContain('f12r.tif')
    );
    expect(screen.getByTestId('items').textContent).toBe('');
    expect(mockedGetSession).not.toHaveBeenCalled();
  });

  it('leaves a fresh foreign-tab crumb alone — its tab is alive', async () => {
    seedCrumb({ tabId: 'another-tab', updatedAt: Date.now() });
    renderHarness();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByTestId('interrupted').textContent).toBe('');
    expect(listUploadBreadcrumbs()).toHaveLength(1); // untouched, not deleted
  });

  it('adopts a foreign-tab crumb whose heartbeat went stale', async () => {
    seedCrumb({
      tabId: 'another-tab',
      updatedAt: Date.now() - UPLOAD_BREADCRUMB_STALE_MS - 1_000,
    });
    renderHarness();
    await waitFor(() =>
      expect(screen.getByTestId('interrupted').textContent).toContain('f12r.tif')
    );
  });

  it('routes a completed session to a done tray item and clears the crumb', async () => {
    seedCrumb({ sessionId: 's1' });
    mockedGetSession.mockResolvedValue(session({ status: 'complete', item_image: 99 }));
    const { invalidateSpy } = renderHarness();

    await waitFor(() => expect(screen.getByTestId('items').textContent).toContain('f12r.tif:done'));
    expect(mockedGetSession).toHaveBeenCalledWith('tok', 's1');
    expect(screen.getByTestId('interrupted').textContent).toBe('');
    expect(listUploadBreadcrumbs()).toEqual([]);
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('re-attaches to a processing session and finishes when the conversion does', async () => {
    seedCrumb({ sessionId: 's1' });
    mockedGetSession.mockResolvedValue(session({ status: 'processing' }));
    let finishWatch!: (s: UploadSession) => void;
    mockedWatch.mockImplementation(() => new Promise((resolve) => (finishWatch = resolve)));
    renderHarness();

    // Re-attached without needing the File: shown as processing, not prompted.
    await waitFor(() =>
      expect(screen.getByTestId('items').textContent).toContain('f12r.tif:processing')
    );
    expect(screen.getByTestId('interrupted').textContent).toBe('');

    finishWatch(session({ status: 'complete' }));
    await waitFor(() => expect(screen.getByTestId('items').textContent).toContain('f12r.tif:done'));
    expect(listUploadBreadcrumbs()).toEqual([]);
  });

  it('falls back to the re-select prompt when the session lookup fails', async () => {
    seedCrumb({ sessionId: 's-gone' });
    mockedGetSession.mockRejectedValue(new Error('404'));
    renderHarness();
    await waitFor(() =>
      expect(screen.getByTestId('interrupted').textContent).toContain('f12r.tif')
    );
  });
});

describe('resume & dismiss', () => {
  it('re-enqueues a matching file with the saved target and metadata', async () => {
    seedCrumb();
    let finishUpload!: (s: UploadSession) => void;
    mockedUpload.mockImplementation(() => new Promise((resolve) => (finishUpload = resolve)));
    renderHarness();
    await waitFor(() =>
      expect(screen.getByTestId('interrupted').textContent).toContain('f12r.tif')
    );

    fireEvent.click(screen.getByText('resume matching'));
    expect(screen.getByTestId('resume-result').textContent).toBe('1|');
    expect(screen.getByTestId('interrupted').textContent).toBe('');
    await waitFor(() =>
      expect(screen.getByTestId('items').textContent).toContain('f12r.tif:uploading')
    );
    expect(mockedUpload).toHaveBeenCalledWith(
      'tok',
      expect.objectContaining({ name: 'f12r.tif' }),
      { item_part: 3, locus: 'f.3r', tags: 'recto' },
      expect.anything()
    );

    finishUpload(session({ status: 'complete' }));
    await waitFor(() => expect(screen.getByTestId('items').textContent).toContain('f12r.tif:done'));
    expect(listUploadBreadcrumbs()).toEqual([]);
  });

  it('reports files that match no interrupted upload', async () => {
    seedCrumb();
    renderHarness();
    await waitFor(() =>
      expect(screen.getByTestId('interrupted').textContent).toContain('f12r.tif')
    );

    fireEvent.click(screen.getByText('resume mismatching'));
    expect(screen.getByTestId('resume-result').textContent).toBe('0|other.tif');
    expect(screen.getByTestId('interrupted').textContent).toContain('f12r.tif'); // still waiting
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it('dismiss deletes the breadcrumb and the server session with it', async () => {
    seedCrumb({ sessionId: 's1' });
    mockedGetSession.mockRejectedValue(new Error('offline'));
    renderHarness();
    await waitFor(() =>
      expect(screen.getByTestId('interrupted').textContent).toContain('f12r.tif')
    );

    fireEvent.click(screen.getByText('dismiss interrupted'));
    await waitFor(() => expect(screen.getByTestId('interrupted').textContent).toBe(''));
    // Discarding the last handle on a session must free its chunks too.
    expect(mockedAbort).toHaveBeenCalledWith('tok', 's1');
    expect(listUploadBreadcrumbs()).toEqual([]);
  });
});

describe('reindex nudge', () => {
  it('stays quiet for uploads recovered after a reload', async () => {
    // The count cannot survive a reload: a crumb is deleted the moment its
    // upload succeeds, so images that landed before the reload leave no trace.
    // Nudging from here reported a number that understated what happened —
    // 2 uploads announced as 1 — so the recovery paths say nothing at all.
    seedCrumb({ id: 'crumb-A', sessionId: 'sA', fileName: 'a.tif' });
    seedCrumb({ id: 'crumb-B', sessionId: 'sB', fileName: 'b.tif' });
    mockedGetSession.mockImplementation((_t, id) =>
      Promise.resolve(
        session(id === 'sA' ? { status: 'complete', item_image: 1 } : { status: 'processing' })
      )
    );
    mockedWatch.mockResolvedValue(session({ status: 'complete', item_image: 2 }));

    renderHarness();

    await waitFor(() => expect(mockedWatch).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('items').textContent).toContain('b.tif:done'));
    expect(vi.mocked(toast.info)).not.toHaveBeenCalled();
  });

  it('stays quiet when the run was cut short by signing out', async () => {
    // The count would only cover what got through before the token died, and
    // the toast lands on the login page where it reads as a report on the whole
    // batch. This was the last toast still reaching that screen.
    let call = 0;
    mockedUpload.mockImplementation(() => {
      call += 1;
      if (call === 1) return Promise.resolve(session({ status: 'complete', item_image: 1 }));
      document.cookie = 'archetype_auth_token=; Path=/; Max-Age=0';
      return Promise.reject(new BackofficeApiError(401, { detail: 'Invalid token.' }));
    });
    renderHarness();

    fireEvent.click(screen.getByText('enqueue three'));

    await waitFor(() => expect(screen.getByTestId('items').textContent).toContain('c.tif:error'));
    // One file did land, so the guard is on the sign-out, not on the count.
    expect(screen.getByTestId('items').textContent).toContain('a.tif:done');
    expect(vi.mocked(toast.info)).not.toHaveBeenCalled();
  });

  it('nudges once, with the real count, for a batch this tab uploaded', async () => {
    mockedUpload.mockResolvedValue(session({ status: 'complete', item_image: 9 }));
    renderHarness();

    fireEvent.click(screen.getByText('enqueue three'));

    await waitFor(() => expect(vi.mocked(toast.info)).toHaveBeenCalledTimes(1));
    expect(vi.mocked(toast.info).mock.calls[0][0]).toContain('3');
  });
});

describe('multi-tab ownership', () => {
  it('parks an upload whose file is live in another tab as busy', async () => {
    // A live sibling tab is already uploading new.tif (4 bytes) to part 3.
    seedCrumb({
      id: 'foreign-1',
      tabId: 'other-tab',
      updatedAt: Date.now(),
      fileName: 'new.tif',
      fileSize: 4,
    });
    renderHarness();

    fireEvent.click(screen.getByText('enqueue one'));
    await waitFor(() => expect(screen.getByTestId('items').textContent).toContain('new.tif:busy'));
    expect(mockedUpload).not.toHaveBeenCalled();
    // Our crumb stepped aside; only the owner's remains.
    expect(listUploadBreadcrumbs().map((c) => c.id)).toEqual(['foreign-1']);
  });

  it('busy is terminal — no take-over; a fresh enqueue works once the rival stops', async () => {
    seedCrumb({
      id: 'foreign-1',
      tabId: 'other-tab',
      updatedAt: Date.now(),
      fileName: 'new.tif',
      fileSize: 4,
    });
    let finishUpload!: (s: UploadSession) => void;
    mockedUpload.mockImplementation(() => new Promise((resolve) => (finishUpload = resolve)));
    renderHarness();

    fireEvent.click(screen.getByText('enqueue one'));
    await waitFor(() => expect(screen.getByTestId('items').textContent).toContain('new.tif:busy'));

    // Retry deliberately does nothing for a busy item (no take-over path).
    fireEvent.click(screen.getByText('retry first'));
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByTestId('items').textContent).toContain('new.tif:busy');
    expect(mockedUpload).not.toHaveBeenCalled();

    // The other tab stops its upload: the crumb persists (reload recovery)
    // but is no longer in flight — a fresh enqueue now proceeds immediately.
    const [foreign] = listUploadBreadcrumbs();
    localStorage.setItem(
      UPLOAD_BREADCRUMBS_STORAGE_KEY,
      JSON.stringify([{ ...foreign, status: 'canceled' }])
    );
    fireEvent.click(screen.getByText('enqueue one'));
    await waitFor(() =>
      expect(screen.getByTestId('items').textContent).toContain('new.tif:uploading')
    );
    expect(mockedUpload).toHaveBeenCalledTimes(1);

    finishUpload(session({ status: 'complete' }));
    await waitFor(() => expect(screen.getByTestId('items').textContent).toContain('new.tif:done'));
  });

  it('yields to an older live tab that holds the same server session', async () => {
    // Different filename, so the duplicate check passes — this exercises the
    // session-rival path that closes the near-simultaneous-start tie.
    seedCrumb({
      id: 'a-elder',
      tabId: 'other-tab',
      updatedAt: Date.now(),
      createdAt: Date.now() - 5_000,
      fileName: 'other-name.tif',
      sessionId: 's-new',
    });
    mockedUpload.mockImplementation((_token, _file, _meta, options) => {
      options?.onProgress?.({
        phase: 'uploading',
        sentBytes: 1,
        totalBytes: 4,
        session: session({ id: 's-new' }),
      });
      return new Promise((_resolve, reject) => {
        const abort = () => reject(new DOMException('Aborted', 'AbortError'));
        if (options?.signal?.aborted) abort();
        else options?.signal?.addEventListener('abort', abort);
      });
    });
    renderHarness();

    fireEvent.click(screen.getByText('enqueue one'));
    await waitFor(() => expect(screen.getByTestId('items').textContent).toContain('new.tif:busy'));
    expect(listUploadBreadcrumbs().map((c) => c.id)).toEqual(['a-elder']);
  });
});

describe('cancel', () => {
  it('discards the server session and the breadcrumb with it', async () => {
    mockedUpload.mockImplementation((_token, _file, _meta, options) => {
      options?.onProgress?.({
        phase: 'uploading',
        sentBytes: 1,
        totalBytes: 4,
        session: session({ id: 's-new' }),
      });
      return new Promise((_resolve, reject) =>
        options?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError'))
        )
      );
    });
    renderHarness();

    fireEvent.click(screen.getByText('enqueue one'));
    await waitFor(() =>
      expect(screen.getByTestId('items').textContent).toContain('new.tif:uploading')
    );

    fireEvent.click(screen.getByText('cancel first'));
    await waitFor(() =>
      expect(screen.getByTestId('items').textContent).toContain('new.tif:canceled')
    );
    // Without the DELETE the half-uploaded chunks stay on disk and the session
    // keeps the destination reserved against every other editor.
    expect(mockedAbort).toHaveBeenCalledWith('tok', 's-new');
    // Keeping the crumb (as 'canceled') would have a reload re-offer the
    // upload the editor just stopped as "interrupted by a reload".
    expect(listUploadBreadcrumbs()).toEqual([]);
  });
});

describe('logout mid-queue', () => {
  it('stops the queue instead of firing a failed upload per file', async () => {
    // Logout clears the cookie synchronously (clearAuthTokenCookie) but leaves
    // this provider's tokenRef holding the revoked token, because
    // BackofficeShell stops rendering it rather than re-rendering with null.
    // Reading the ref meant every queued file hit createUploadSession with a
    // dead token and raised a toast on the login page.
    document.cookie = 'archetype_auth_token=; Path=/; Max-Age=0';
    renderHarness();

    fireEvent.click(screen.getByText('enqueue one'));

    await waitFor(() => expect(screen.getByTestId('items').textContent).toContain('new.tif:error'));
    expect(mockedUpload).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe('signing out mid-upload', () => {
  it('does not hand the rest of the queue to whoever signs in next', async () => {
    // The server takes owner=request.user, so continuing under a new token puts
    // someone else's name on files this user chose.
    const tokens: string[] = [];
    mockedUpload.mockImplementation((token: string) => {
      tokens.push(token);
      if (tokens.length === 1) {
        document.cookie = 'archetype_auth_token=; Path=/; Max-Age=0';
        document.cookie = 'archetype_auth_token=tok_other_user; Path=/';
        return Promise.reject(new BackofficeApiError(401, { detail: 'Invalid token.' }));
      }
      return Promise.resolve(session({ status: 'complete', item_image: 1 }));
    });
    renderHarness();

    fireEvent.click(screen.getByText('enqueue three'));

    await waitFor(() => expect(screen.getByTestId('items').textContent).toContain('c.tif:error'));
    // Only the file that was already in flight ever ran.
    expect(tokens).toEqual(['tok']);
  });

  it('reports a signed-out transfer as resumable, not failed, and stays quiet', async () => {
    mockedUpload.mockRejectedValue(new BackofficeApiError(401, { detail: 'Invalid token.' }));
    renderHarness();

    fireEvent.click(screen.getByText('enqueue one'));

    await waitFor(() => expect(screen.getByTestId('items').textContent).toContain('new.tif:error'));
    // No raw "Invalid token." reaches the editor, and no toast lands on the
    // login page they were just redirected to.
    expect(screen.getByTestId('itemErrors').textContent).not.toContain('Invalid token');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not call a finished conversion a failure', async () => {
    // Bytes are all in and Celery is converting; the poll 401s but the server
    // completes regardless, so this must not read as a failed upload.
    mockedUpload.mockImplementation((_token, _file, _meta, options) => {
      options?.onProgress?.({
        phase: 'processing',
        sentBytes: 4,
        totalBytes: 4,
        session: session({ status: 'processing' }),
      });
      return Promise.reject(new BackofficeApiError(401, { detail: 'Invalid token.' }));
    });
    renderHarness();

    fireEvent.click(screen.getByText('enqueue one'));

    await waitFor(() => expect(screen.getByTestId('items').textContent).toContain('new.tif:error'));
    expect(screen.getByTestId('itemErrors').textContent).toContain('finishing');
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe('enqueue write-through', () => {
  it('leaves a breadcrumb while uploading, records the session id, and clears on done', async () => {
    let finishUpload!: (s: UploadSession) => void;
    mockedUpload.mockImplementation((_token, _file, _meta, options) => {
      // Simulate the orchestrator reporting once the server session exists.
      options?.onProgress?.({
        phase: 'uploading',
        sentBytes: 1,
        totalBytes: 4,
        session: session({ id: 's-new' }),
      });
      return new Promise((resolve) => (finishUpload = resolve));
    });
    renderHarness();

    fireEvent.click(screen.getByText('enqueue one'));
    await waitFor(() =>
      expect(screen.getByTestId('items').textContent).toContain('new.tif:uploading')
    );
    const crumbs = listUploadBreadcrumbs();
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0].fileName).toBe('new.tif');
    expect(crumbs[0].sessionId).toBe('s-new');

    finishUpload(session({ status: 'complete' }));
    await waitFor(() => expect(screen.getByTestId('items').textContent).toContain('new.tif:done'));
    expect(listUploadBreadcrumbs()).toEqual([]);
  });
});
