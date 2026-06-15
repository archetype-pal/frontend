import { beforeEach, describe, expect, it, vi } from 'vitest';

const authFetchMock = vi.fn();
vi.mock('@/lib/api-fetch', () => ({
  authFetch: (...args: unknown[]) => authFetchMock(...args),
}));

import {
  createViewerAnnotation,
  deleteViewerAnnotation,
  fetchAnnotationsForImage,
  updateViewerAnnotation,
  type BackendGraph,
} from './annotations';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function textResponse(status: number, text: string) {
  return new Response(text, { status, headers: { 'content-type': 'text/plain' } });
}

const ANNOTATION: BackendGraph['annotation'] = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
  },
};

beforeEach(() => {
  authFetchMock.mockReset();
});

describe('fetchAnnotationsForImage', () => {
  it('builds the graphs query with item_image and optional filters', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(200, []));
    await fetchAnnotationsForImage('42', '7', 'text', 'tok');
    const [path, token, init] = authFetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/manuscripts/graphs/?item_image=42&allograph=7&annotation_type=text');
    expect(token).toBe('tok');
    expect((init as RequestInit)?.cache).toBe('no-store');
  });

  it('omits annotation_type when explicitly null', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(200, []));
    await fetchAnnotationsForImage('42', undefined, null);
    const [path] = authFetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/manuscripts/graphs/?item_image=42');
  });

  it('throws on a non-OK response', async () => {
    authFetchMock.mockResolvedValueOnce(textResponse(500, 'boom'));
    await expect(fetchAnnotationsForImage('42')).rejects.toThrow('Failed to load annotations');
  });
});

describe('createViewerAnnotation', () => {
  it('POSTs with a default annotation_type of "image"', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 1 }));
    await createViewerAnnotation('tok', { item_image: 42, annotation: ANNOTATION });
    const [path, token, init] = authFetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/annotations/graphs/');
    expect(token).toBe('tok');
    const body = JSON.parse((init as RequestInit).body as string);
    expect((init as RequestInit).method).toBe('POST');
    expect(body.annotation_type).toBe('image');
  });

  it('preserves an explicit annotation_type', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 1 }));
    await createViewerAnnotation('tok', {
      item_image: 42,
      annotation: ANNOTATION,
      annotation_type: 'editorial',
    });
    const body = JSON.parse((authFetchMock.mock.calls[0]![2] as RequestInit).body as string);
    expect(body.annotation_type).toBe('editorial');
  });

  it('throws with the status + body on a non-OK response', async () => {
    authFetchMock.mockResolvedValueOnce(textResponse(400, 'invalid'));
    await expect(
      createViewerAnnotation('tok', { item_image: 42, annotation: ANNOTATION })
    ).rejects.toThrow('POST failed: 400 invalid');
  });
});

describe('updateViewerAnnotation', () => {
  it('PATCHes the graph by id', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 5 }));
    await updateViewerAnnotation('tok', 5, { note: 'hi' });
    const [path, , init] = authFetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/annotations/graphs/5/');
    expect((init as RequestInit).method).toBe('PATCH');
  });

  it('throws with the status + body on a non-OK response', async () => {
    authFetchMock.mockResolvedValueOnce(textResponse(409, 'conflict'));
    await expect(updateViewerAnnotation('tok', 5, { note: 'hi' })).rejects.toThrow(
      'PATCH failed: 409 conflict'
    );
  });
});

describe('deleteViewerAnnotation', () => {
  it('DELETEs the graph by id and resolves on OK', async () => {
    authFetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(deleteViewerAnnotation('tok', 5)).resolves.toBeUndefined();
    const [path, , init] = authFetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/annotations/graphs/5/');
    expect((init as RequestInit).method).toBe('DELETE');
  });

  it('throws with the status + body on a non-OK response', async () => {
    authFetchMock.mockResolvedValueOnce(textResponse(404, 'gone'));
    await expect(deleteViewerAnnotation('tok', 5)).rejects.toThrow('DELETE failed: 404 gone');
  });
});
