import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  getUploadSession,
  uploadImageFile,
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
  };
});

const mockedUpload = vi.mocked(uploadImageFile);
const mockedGetSession = vi.mocked(getUploadSession);
const mockedWatch = vi.mocked(watchUploadSession);

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
  const { items, interrupted, enqueue, retry, resumeInterrupted, dismissInterrupted } =
    useUploadManager();
  const [resume, setResume] = useState<ResumeResult | null>(null);
  return (
    <div>
      <output data-testid="items">
        {items.map((it) => `${it.fileName}:${it.status}`).join(',')}
      </output>
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

  it('dismiss deletes the breadcrumb for good', async () => {
    seedCrumb();
    renderHarness();
    await waitFor(() =>
      expect(screen.getByTestId('interrupted').textContent).toContain('f12r.tif')
    );

    fireEvent.click(screen.getByText('dismiss interrupted'));
    await waitFor(() => expect(screen.getByTestId('interrupted').textContent).toBe(''));
    expect(listUploadBreadcrumbs()).toEqual([]);
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
