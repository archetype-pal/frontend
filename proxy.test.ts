/** @vitest-environment node */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_TOKEN_COOKIE } from '@/lib/auth-token-cookie';
import { proxy } from './proxy';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('proxy', () => {
  it('sets the CSP and its nonce on a page, without reading any configuration', () => {
    const response = proxy(new NextRequest('http://localhost:3000/lightbox'));

    const nonce = response.headers.get('x-nonce');
    expect(nonce).toBeTruthy();
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    expect(response.headers.get('location')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('leaves search routing to the search pages', () => {
    const response = proxy(new NextRequest('http://localhost:3000/search?keyword=Kelso'));

    expect(response.headers.get('location')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a signed-out backoffice request to the sign-in page', () => {
    const response = proxy(new NextRequest('http://localhost:3000/backoffice/scribes'));

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?next=%2Fbackoffice%2Fscribes'
    );
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('lets a backoffice request with the auth cookie through', () => {
    const request = new NextRequest('http://localhost:3000/backoffice', {
      headers: { cookie: `${AUTH_TOKEN_COOKIE}=token` },
    });

    expect(proxy(request).headers.get('location')).toBeNull();
  });
});
