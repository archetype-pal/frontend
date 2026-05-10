import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the underlying authFetch so each test can control the response
// without standing up real fetch infra.
const authFetchMock = vi.fn();
vi.mock('@/lib/api-fetch', () => ({
  authFetch: (...args: unknown[]) => authFetchMock(...args),
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
  authFetchMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('backofficeGet', () => {
  it('returns the parsed JSON body on a 2xx response', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 1, name: 'X' }));
    await expect(backofficeGet<{ id: number; name: string }>('/x', 'tok')).resolves.toEqual({
      id: 1,
      name: 'X',
    });
  });

  it('passes path + token + a default Content-Type to authFetch', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    await backofficeGet('/x', 'tok');
    const [path, token, init] = authFetchMock.mock.calls[0]!;
    expect(path).toBe('/x');
    expect(token).toBe('tok');
    const headers = (init as RequestInit)?.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('throws BackofficeApiError with status + body on a 4xx', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(400, { detail: 'bad' }));
    await expect(backofficeGet('/x', 'tok')).rejects.toMatchObject({
      name: 'BackofficeApiError',
      status: 400,
      body: { detail: 'bad' },
    });
  });

  it('falls back to an empty body when the error response is not JSON', async () => {
    authFetchMock.mockResolvedValueOnce(textResponse(403, '<html>nope</html>'));
    await expect(backofficeGet('/x', 'tok')).rejects.toMatchObject({
      status: 403,
      body: {},
    });
  });
});

describe('backofficeDelete', () => {
  it('resolves to undefined on 204 (no body)', async () => {
    authFetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(backofficeDelete('/x/1/', 'tok')).resolves.toBeUndefined();
  });

  it('sends method=DELETE', async () => {
    authFetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await backofficeDelete('/x/1/', 'tok');
    expect(authFetchMock.mock.calls[0]![2]).toMatchObject({ method: 'DELETE' });
  });
});

describe('backofficePost / backofficePatch', () => {
  it('POST stringifies the JSON body and sets method=POST', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 1 }));
    await backofficePost('/x/', 'tok', { name: 'Foo' });
    const init = authFetchMock.mock.calls[0]![2] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'Foo' }));
  });

  it('PATCH stringifies the JSON body and sets method=PATCH', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 1 }));
    await backofficePatch('/x/1/', 'tok', { name: 'Bar' });
    const init = authFetchMock.mock.calls[0]![2] as RequestInit;
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ name: 'Bar' }));
  });
});

describe('backofficePostFormData / backofficePatchFormData', () => {
  it('does NOT set Content-Type so the browser can add the multipart boundary', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 1 }));
    const fd = new FormData();
    fd.append('file', new Blob(['x']), 'a.txt');
    await backofficePostFormData('/x/', 'tok', fd);
    const init = authFetchMock.mock.calls[0]![2] as RequestInit;
    // Headers param is NOT set on the FormData branch — that's the contract.
    expect(init.headers).toBeUndefined();
    expect(init.method).toBe('POST');
    expect(init.body).toBe(fd);
  });

  it('PATCH variant uses method=PATCH', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 1 }));
    const fd = new FormData();
    await backofficePatchFormData('/x/1/', 'tok', fd);
    const init = authFetchMock.mock.calls[0]![2] as RequestInit;
    expect(init.method).toBe('PATCH');
  });

  it('204 from a FormData PATCH resolves to undefined', async () => {
    authFetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const fd = new FormData();
    await expect(backofficePatchFormData('/x/1/', 'tok', fd)).resolves.toBeUndefined();
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
    authFetchMock
      .mockResolvedValueOnce(textResponse(502, 'gateway'))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const promise = backofficeGet<{ ok: boolean }>('/x', 'tok');
    // Drain the per-attempt setTimeout(500ms).
    await vi.advanceTimersByTimeAsync(500);
    await expect(promise).resolves.toEqual({ ok: true });
    expect(authFetchMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on a 400 (non-transient)', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse(400, { detail: 'bad' }));
    await expect(backofficeGet('/x', 'tok')).rejects.toBeInstanceOf(BackofficeApiError);
    expect(authFetchMock).toHaveBeenCalledTimes(1);
  });
});
