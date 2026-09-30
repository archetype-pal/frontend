import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the underlying proxyFetch so each test can control the response
// without standing up real fetch infra.
const proxyFetchMock = vi.fn();
vi.mock('@/lib/api-fetch', () => ({
  proxyFetch: (...args: unknown[]) => proxyFetchMock(...args),
}));

import {
  BackofficeApiError,
  backofficeDelete,
  backofficeGet,
  backofficePatch,
  backofficePatchFormData,
  backofficePost,
  backofficePostFormData,
} from './api-client';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function textResponse(status: number, text: string) {
  return new Response(text, { status, headers: { 'content-type': 'text/plain' } });
}

beforeEach(() => {
  proxyFetchMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('backofficeGet', () => {
  it('returns the parsed JSON body on a 2xx response', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 1, name: 'X' }));
    await expect(backofficeGet<{ id: number; name: string }>('/x')).resolves.toEqual({
      id: 1,
      name: 'X',
    });
  });

  it('passes path + a default Content-Type to proxyFetch', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    await backofficeGet('/x');
    const [path, init] = proxyFetchMock.mock.calls[0]!;
    expect(path).toBe('/x');
    const headers = (init as RequestInit)?.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('throws BackofficeApiError with status + body on a 4xx', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse(400, { detail: 'bad' }));
    await expect(backofficeGet('/x')).rejects.toMatchObject({
      name: 'BackofficeApiError',
      status: 400,
      body: { detail: 'bad' },
    });
  });

  it('falls back to an empty body when the error response is not JSON', async () => {
    proxyFetchMock.mockResolvedValueOnce(textResponse(403, '<html>nope</html>'));
    await expect(backofficeGet('/x')).rejects.toMatchObject({
      status: 403,
      body: {},
    });
  });
});

describe('backofficeDelete', () => {
  it('resolves to undefined on 204 (no body)', async () => {
    proxyFetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(backofficeDelete('/x/1/')).resolves.toBeUndefined();
  });

  it('sends method=DELETE', async () => {
    proxyFetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await backofficeDelete('/x/1/');
    expect(proxyFetchMock.mock.calls[0]![1]).toMatchObject({ method: 'DELETE' });
  });
});

describe('backofficePost / backofficePatch', () => {
  it('POST stringifies the JSON body and sets method=POST', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 1 }));
    await backofficePost('/x/', { name: 'Foo' });
    const init = proxyFetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'Foo' }));
  });

  it('PATCH stringifies the JSON body and sets method=PATCH', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 1 }));
    await backofficePatch('/x/1/', { name: 'Bar' });
    const init = proxyFetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ name: 'Bar' }));
  });
});

describe('backofficePostFormData / backofficePatchFormData', () => {
  it('does NOT set Content-Type so the browser can add the multipart boundary', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 1 }));
    const fd = new FormData();
    fd.append('file', new Blob(['x']), 'a.txt');
    await backofficePostFormData('/x/', fd);
    const init = proxyFetchMock.mock.calls[0]![1] as RequestInit;
    // Headers param is NOT set on the FormData branch — that's the contract.
    expect(init.headers).toBeUndefined();
    expect(init.method).toBe('POST');
    expect(init.body).toBe(fd);
  });

  it('PATCH variant uses method=PATCH', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 1 }));
    const fd = new FormData();
    await backofficePatchFormData('/x/1/', fd);
    const init = proxyFetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('PATCH');
  });

  it('204 from a FormData PATCH resolves to undefined', async () => {
    proxyFetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const fd = new FormData();
    await expect(backofficePatchFormData('/x/1/', fd)).resolves.toBeUndefined();
  });
});

describe('BackofficeApiError', () => {
  it('exposes status, body, and the documented name', () => {
    const e = new BackofficeApiError(418, { detail: 'teapot' });
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('BackofficeApiError');
    expect(e.status).toBe(418);
    expect(e.body).toEqual({ detail: 'teapot' });
    // Default message is consistent with the class — useful for log scrapers.
    expect(e.message).toBe('API error 418');
  });
});

describe('transient retry', () => {
  it('retries on 502 and returns the eventual 200', async () => {
    vi.useFakeTimers();
    proxyFetchMock
      .mockResolvedValueOnce(textResponse(502, 'gateway'))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const promise = backofficeGet<{ ok: boolean }>('/x');
    // Drain the per-attempt setTimeout(500ms).
    await vi.advanceTimersByTimeAsync(500);
    await expect(promise).resolves.toEqual({ ok: true });
    expect(proxyFetchMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on a 400 (non-transient)', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse(400, { detail: 'bad' }));
    await expect(backofficeGet('/x')).rejects.toBeInstanceOf(BackofficeApiError);
    expect(proxyFetchMock).toHaveBeenCalledTimes(1);
  });
});
