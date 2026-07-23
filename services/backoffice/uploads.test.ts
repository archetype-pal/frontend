import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BackofficeApiError,
  ChunkUploadError,
  UploadFailedError,
  chunkErrorDetail,
  describeUploadError,
  isConflictError,
  uploadErrorStatus,
  watchUploadSession,
  type UploadSession,
} from './uploads';
import { backofficeGet } from './api-client';

// Mock only the transport; the real BackofficeApiError class must stay intact
// for the error-helper tests below.
vi.mock('./api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api-client')>();
  return { ...actual, backofficeGet: vi.fn() };
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

  it('falls back to a status message when the body has no detail', () => {
    expect(describeUploadError(new BackofficeApiError(500, {}))).toBe('Request failed (500).');
  });

  it('handles chunk, upload-failed, generic and unknown errors', () => {
    expect(describeUploadError(new ChunkUploadError(502, 'gateway'))).toBe('gateway');
    expect(describeUploadError(new UploadFailedError('conversion died', {} as never))).toBe(
      'conversion died'
    );
    expect(describeUploadError(new Error('boom'))).toBe('boom');
    expect(describeUploadError('weird')).toBe('Upload failed.');
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

  it('stops with AbortError when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      watchUploadSession('tok', session(), { signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(mockedGet).not.toHaveBeenCalled();
  });
});
