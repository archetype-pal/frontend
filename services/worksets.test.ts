import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.fn();
const proxyFetchMock = vi.fn();
vi.mock('@/lib/api-fetch', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
  proxyFetch: (...args: unknown[]) => proxyFetchMock(...args),
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
  proxyFetchMock.mockReset();
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
  it('goes through the proxy and unwraps paginated results', async () => {
    proxyFetchMock.mockResolvedValueOnce(
      jsonResponse(200, { count: 1, results: [{ public_id: 'a' }] })
    );
    const result = await listMyWorksets();
    expect(result).toEqual([{ public_id: 'a' }]);
    const [path] = proxyFetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/worksets/');
  });

  it('returns [] when unauthorized', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse(401, {}));
    await expect(listMyWorksets()).resolves.toEqual([]);
  });
});

describe('createWorkset', () => {
  it('POSTs the input through the proxy', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse(201, { public_id: 'new' }));
    await createWorkset({ title: 'My set', payload: PAYLOAD });
    const [path, init] = proxyFetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/worksets/');
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      title: 'My set',
      payload: PAYLOAD,
    });
  });

  it('throws on a non-2xx response', async () => {
    proxyFetchMock.mockResolvedValueOnce(new Response('bad', { status: 400 }));
    await expect(createWorkset({ title: '', payload: PAYLOAD })).rejects.toThrow();
  });
});

describe('updateWorkset', () => {
  it('PATCHes the public_id path', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse(200, { public_id: 'abc' }));
    await updateWorkset('abc', { visibility: 'Public' });
    const [path, init] = proxyFetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/worksets/abc/');
    expect((init as RequestInit).method).toBe('PATCH');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ visibility: 'Public' });
  });
});

describe('deleteWorkset', () => {
  it('DELETEs and tolerates 204', async () => {
    proxyFetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(deleteWorkset('abc')).resolves.toBeUndefined();
    const [path, init] = proxyFetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/worksets/abc/');
    expect((init as RequestInit).method).toBe('DELETE');
  });
});
