import { describe, it, expect, afterEach, vi } from 'vitest';

import {
  clearAuthTokenCookie,
  clearImpersonatorTokenCookie,
  setAuthTokenCookie,
  setImpersonatorTokenCookie,
} from './auth-token-cookie';

function captureWrite(run: () => void): string {
  let written = '';
  const spy = vi.spyOn(Document.prototype, 'cookie', 'set').mockImplementation((value: string) => {
    written = value;
  });
  run();
  spy.mockRestore();
  return written;
}

afterEach(() => {
  clearAuthTokenCookie();
  clearImpersonatorTokenCookie();
});

describe('auth token cookies', () => {
  it('persists the auth cookie for 30 days when not impersonating', () => {
    expect(captureWrite(() => setAuthTokenCookie('admin-token'))).toContain('Max-Age=2592000');
  });

  it('session-scopes the impersonator stash', () => {
    expect(captureWrite(() => setImpersonatorTokenCookie('admin-token'))).not.toContain('Max-Age');
  });

  it('session-scopes the auth cookie while a stash is present, so it cannot outlive it', () => {
    setImpersonatorTokenCookie('admin-token');
    expect(captureWrite(() => setAuthTokenCookie('target-token'))).not.toContain('Max-Age');
  });
});
