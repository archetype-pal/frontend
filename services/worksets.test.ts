import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.fn();
const authFetchMock = vi.fn();
vi.mock('@/lib/api-fetch', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
  authFetch: (...args: unknown[]) => authFetchMock(...args),
}));

import {
  createWorkset,
  deleteWorkset,
  getWorkset,
  listMyWorksets,
  updateWorkset,
} from './worksets';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const PAYLOAD = { schema_version: 2, workspaces: [], images: [] };

beforeEach(() => {
  apiFetchMock.mockReset();
  authFetchMock.mockReset();
});

describe('getWorkset', () => {
  it('fetches anonymously and returns the parsed detail on 200', async () => {
    apiFetchMock.mockResolvedValueOnce(jsonResponse(200, { public_id: 'abc', title: 'T' }));
    const result = await getWorkset('abc');
    expect(result).toEqual({ public_id: 'abc', title: 'T' });
    const [path] = apiFetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/worksets/abc/');
  });

  it('returns null on 404 (unknown or private)', async () => {
    apiFetchMock.mockResolvedValueOnce(jsonResponse(404, {}));
    await expect(getWorkset('missing')).resolves.toBeNull();
  });

  it('throws on a 5xx so a transient outage is not a false 404', async () => {
    apiFetchMock.mockResolvedValueOnce(jsonResponse(503, {}));
    await expect(getWorkset('abc')).rejects.toThrow();
  });
});

describe('listMyWorksets', () => {
  it('passes the token and unwraps paginated results', async () => {
    authFetchMock.mockResolvedValueOnce(
      jsonResponse(200, { count: 1, results: [{ public_id: 'a' }] })
    );
    const result = await listMyWorksets('tok');
    expect(result).toEqual([{ public_id: 'a' }]);
    const [path, token] = authFetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/worksets/');
    expect(token).toBe('tok');
  });

  it('returns [] when unauthorized', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(401, {}));
    await expect(listMyWorksets('tok')).resolves.toEqual([]);
  });
});

describe('createWorkset', () => {
  it('POSTs the input with the token', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(201, { public_id: 'new' }));
    await createWorkset('tok', { title: 'My set', payload: PAYLOAD });
    const [path, token, init] = authFetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/worksets/');
    expect(token).toBe('tok');
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      title: 'My set',
      payload: PAYLOAD,
    });
  });

  it('throws on a non-2xx response', async () => {
    authFetchMock.mockResolvedValueOnce(new Response('bad', { status: 400 }));
    await expect(createWorkset('tok', { title: '', payload: PAYLOAD })).rejects.toThrow();
  });
});

describe('updateWorkset', () => {
  it('PATCHes the public_id path', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(200, { public_id: 'abc' }));
    await updateWorkset('tok', 'abc', { visibility: 'Public' });
    const [path, , init] = authFetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/worksets/abc/');
    expect((init as RequestInit).method).toBe('PATCH');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ visibility: 'Public' });
  });
});

describe('deleteWorkset', () => {
  it('DELETEs and tolerates 204', async () => {
    authFetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(deleteWorkset('tok', 'abc')).resolves.toBeUndefined();
    const [path, , init] = authFetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/worksets/abc/');
    expect((init as RequestInit).method).toBe('DELETE');
  });
});
