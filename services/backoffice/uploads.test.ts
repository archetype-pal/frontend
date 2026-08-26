import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BackofficeApiError,
  ChunkUploadError,
  UploadFailedError,
  chunkErrorDetail,
  describeUploadError,
  isConflictError,
  uploadErrorStatus,
  uploadImageFile,
  watchUploadSession,
  type UploadProgress,
  type UploadSession,
} from './uploads';
import { backofficeGet, backofficePost } from './api-client';

// Mock only the transport; the real BackofficeApiError class must stay intact
// for the error-helper tests below.
vi.mock('./api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api-client')>();
  return { ...actual, backofficeGet: vi.fn(), backofficePost: vi.fn() };
});

describe('uploadErrorStatus / isConflictError', () => {
  it('reads the status from HTTP-shaped errors', () => {
    expect(uploadErrorStatus(new BackofficeApiError(409, { detail: 'x' }))).toBe(409);
    expect(uploadErrorStatus(new ChunkUploadError(413, 'too big'))).toBe(413);
    expect(uploadErrorStatus(new Error('network'))).toBeNull();
  });

  it('flags only true-duplicate 409s as conflicts', () => {
    expect(
      isConflictError(new BackofficeApiError(409, { detail: 'exists', code: 'destination_exists' }))
    ).toBe(true);
    // A 409 for someone else's in-flight session is busy, not a duplicate.
    expect(
      isConflictError(new BackofficeApiError(409, { detail: 'busy', code: 'session_active' }))
    ).toBe(false);
    expect(isConflictError(new BackofficeApiError(409, { detail: 'legacy, no code' }))).toBe(false);
    expect(isConflictError(new BackofficeApiError(400, { detail: 'bad' }))).toBe(false);
    expect(isConflictError(new Error('network'))).toBe(false);
  });
});

describe('describeUploadError', () => {
  it("prefers the backend's detail message over the generic status message", () => {
    const err = new BackofficeApiError(409, {
      detail: "A file already exists at 'uploads/item-part-1/f12r.jp2'. Uploads never overwrite.",
    });
    expect(describeUploadError(err)).toContain('already exists');
    // Not the generic "API error 409".
    expect(describeUploadError(err)).not.toBe('API error 409');
  });

  it('names the offending field on a DRF validation 400', () => {
    const err = new BackofficeApiError(400, {
      tags: ['Ensure this field has no more than 255 characters.'],
    });
    expect(describeUploadError(err)).toContain('tags');
    expect(describeUploadError(err)).toContain('no more than 255');
  });

  it('falls back to a status message when the body says nothing', () => {
    expect(describeUploadError(new BackofficeApiError(500, {}))).toBe('Server error (500)');
  });

  it('handles chunk, upload-failed, generic and unknown errors', () => {
    expect(describeUploadError(new ChunkUploadError(502, 'gateway'))).toBe('gateway');
    expect(describeUploadError(new UploadFailedError('conversion died', {} as never))).toBe(
      'conversion died'
    );
    expect(describeUploadError(new Error('boom'))).toBe('boom');
    expect(describeUploadError('weird')).toBe('An unexpected error occurred');
  });
});

describe('chunkErrorDetail', () => {
  it('prefers a JSON detail from the backend', () => {
    expect(
      chunkErrorDetail(
        409,
        '{"detail":"Session is \'processing\'; chunks are no longer accepted."}'
      )
    ).toContain('no longer accepted');
  });

  it('never surfaces an HTML error page (Django debug traceback)', () => {
    const page =
      '<!DOCTYPE html><html><head><title>FileNotFoundError at /api/v1/uploads/…</title></head>…';
    expect(chunkErrorDetail(500, page)).toBe(
      'Server error (500) while uploading a chunk — you can retry the upload.'
    );
  });

  it('keeps a short plain-text body', () => {
    expect(chunkErrorDetail(413, 'Request entity too large')).toBe('Request entity too large');
  });

  it('genericizes empty and over-long bodies', () => {
    expect(chunkErrorDetail(502, '')).toContain('Server error (502)');
    expect(chunkErrorDetail(500, 'x'.repeat(400))).toContain('Server error (500)');
  });
});

describe('watchUploadSession', () => {
  const mockedGet = vi.mocked(backofficeGet);

  const session = (over: Partial<UploadSession> = {}): UploadSession => ({
    id: 's1',
    status: 'processing',
    error: '',
    item_part: 1,
    original_filename: 'f12r.tif',
    declared_size: 100,
    chunk_size: 10,
    total_chunks: 10,
    received_chunks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    missing_chunks: [],
    destination_path: 'uploads/item-part-1/f12r.jp2',
    subfolder: '',
    locus: 'f.12r',
    tags: '',
    item_image: null,
    task_id: 't1',
    task: null,
    ...over,
  });

  afterEach(() => {
    mockedGet.mockReset();
  });

  it('polls until the session completes, reporting each state', async () => {
    mockedGet
      .mockResolvedValueOnce(session({ status: 'processing' }))
      .mockResolvedValueOnce(session({ status: 'complete', item_image: 9 }));

    const phases: string[] = [];
    const result = await watchUploadSession('tok', session({ status: 'assembled' }), {
      pollIntervalMs: 0,
      onProgress: (p) => phases.push(p.phase),
    });

    expect(result.status).toBe('complete');
    expect(result.item_image).toBe(9);
    expect(phases).toEqual(['processing', 'processing', 'complete']);
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it('returns without polling when the session is already terminal', async () => {
    const result = await watchUploadSession('tok', session({ status: 'complete' }));
    expect(result.status).toBe('complete');
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("throws UploadFailedError carrying the server's reason on failure", async () => {
    mockedGet.mockResolvedValueOnce(session({ status: 'failed', error: 'tile smoke test failed' }));
    await expect(watchUploadSession('tok', session(), { pollIntervalMs: 0 })).rejects.toThrow(
      'tile smoke test failed'
    );
  });

  it('rides out a burst of unreadable polls instead of failing a live conversion', async () => {
    mockedGet
      .mockRejectedValueOnce(new Error('API restarting'))
      .mockRejectedValueOnce(new Error('API restarting'))
      .mockRejectedValueOnce(new Error('API restarting'))
      .mockResolvedValueOnce(session({ status: 'complete', item_image: 9 }));

    const result = await watchUploadSession('tok', session(), { pollIntervalMs: 0 });
    expect(result.status).toBe('complete');
  });

  it('gives up on the sixth consecutive failure, not the first', async () => {
    mockedGet.mockRejectedValue(new Error('API gone'));
    await expect(watchUploadSession('tok', session(), { pollIntervalMs: 0 })).rejects.toThrow(
      'API gone'
    );
    expect(mockedGet).toHaveBeenCalledTimes(6); // MAX_POLL_FAILURES + 1
  });

  it('stops with AbortError when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      watchUploadSession('tok', session(), { signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(mockedGet).not.toHaveBeenCalled();
  });
});

describe('uploadImageFile chunk selection', () => {
  const mockedPost = vi.mocked(backofficePost);
  const mockedGet = vi.mocked(backofficeGet);

  // 40 bytes at chunk_size 10 = 4 chunks. The server already holds 0 and 2.
  const resumable = (over: Partial<UploadSession> = {}): UploadSession => ({
    id: 's1',
    status: 'uploading',
    error: '',
    item_part: 1,
    original_filename: 'f12r.tif',
    declared_size: 40,
    chunk_size: 10,
    total_chunks: 4,
    received_chunks: [0, 2],
    missing_chunks: [1, 3],
    destination_path: 'uploads/item-part-1/f12r.jp2',
    subfolder: '',
    locus: '',
    tags: '',
    item_image: null,
    task_id: '',
    task: null,
    ...over,
  });

  /** Records the chunk index of every PUT and resolves each one 204. */
  function stubChunkTransport(): number[] {
    const sent: number[] = [];
    class FakeXhr {
      status = 204;
      responseText = '';
      upload = {} as { onprogress?: (e: ProgressEvent) => void };
      onload?: () => void;
      onerror?: () => void;
      onabort?: () => void;
      open(_method: string, url: string) {
        sent.push(Number(/chunks\/(\d+)\//.exec(url)![1]));
      }
      setRequestHeader() {}
      send() {
        this.onload?.();
      }
      abort() {}
    }
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    return sent;
  }

  afterEach(() => vi.unstubAllGlobals());

  it('PUTs only the chunks the server still needs', async () => {
    const sent = stubChunkTransport();
    mockedPost
      .mockResolvedValueOnce(resumable()) // create-or-resume
      .mockResolvedValueOnce(resumable({ status: 'assembled', missing_chunks: [] })); // finalize
    mockedGet.mockResolvedValueOnce(
      resumable({ status: 'complete', missing_chunks: [], item_image: 9 })
    );

    await uploadImageFile('tok', new File(['x'.repeat(40)], 'f12r.tif'), { item_part: 1 });

    // 0 and 2 are already server-side; re-sending them would double the
    // transfer on every resume, and skipping 1 or 3 would strand the session.
    expect(sent).toEqual([1, 3]);
  });

  it('anchors progress at the bytes the server already holds', async () => {
    stubChunkTransport();
    mockedPost
      .mockResolvedValueOnce(resumable())
      .mockResolvedValueOnce(resumable({ status: 'assembled', missing_chunks: [] }));
    mockedGet.mockResolvedValueOnce(
      resumable({ status: 'complete', missing_chunks: [], item_image: 9 })
    );

    const uploading: number[] = [];
    await uploadImageFile(
      'tok',
      new File(['x'.repeat(40)], 'f12r.tif'),
      { item_part: 1 },
      {
        pollIntervalMs: 0,
        onProgress: (p: UploadProgress) => {
          if (p.phase === 'uploading') uploading.push(p.sentBytes);
        },
      }
    );

    // Chunks 0 and 2 (20 bytes) are already accepted, so the bar starts there
    // rather than at zero and reaches the full 40.
    expect(uploading).toEqual([30, 40]);
  });
});
