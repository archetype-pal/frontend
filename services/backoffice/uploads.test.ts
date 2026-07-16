import { describe, expect, it } from 'vitest';
import {
  BackofficeApiError,
  ChunkUploadError,
  UploadFailedError,
  describeUploadError,
  isConflictError,
  uploadErrorStatus,
} from './uploads';

describe('uploadErrorStatus / isConflictError', () => {
  it('reads the status from HTTP-shaped errors', () => {
    expect(uploadErrorStatus(new BackofficeApiError(409, { detail: 'x' }))).toBe(409);
    expect(uploadErrorStatus(new ChunkUploadError(413, 'too big'))).toBe(413);
    expect(uploadErrorStatus(new Error('network'))).toBeNull();
  });

  it('flags only 409s as conflicts', () => {
    expect(isConflictError(new BackofficeApiError(409, { detail: 'exists' }))).toBe(true);
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
