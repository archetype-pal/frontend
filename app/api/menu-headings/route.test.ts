import { beforeEach, describe, expect, it, vi } from 'vitest';

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath }));

const { authFetch } = vi.hoisted(() => ({ authFetch: vi.fn() }));
vi.mock('@/lib/api-fetch', () => ({ authFetch }));

// Only the cookie read is stubbed: `verifySuperuser` stays real, so the
// superuser checks go through the mocked `authFetch` profile call.
const { getServerAuthToken } = vi.hoisted(() => ({ getServerAuthToken: vi.fn() }));
vi.mock('@/lib/auth-token-server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-token-server')>()),
  getServerAuthToken,
}));

import { NextRequest } from 'next/server';
import { GET as LIST, POST } from './route';
import { DELETE, GET, PATCH } from './[slug]/route';

const PROFILE_PATH = '/api/v1/auth/profile';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

/** Answers the profile call with `isSuperuser`, then every backend call with `backend`. */
function backendReplies(backend: () => Response, isSuperuser = true) {
  authFetch.mockImplementation(async (path: string) =>
    path === PROFILE_PATH ? json({ is_superuser: isSuperuser }) : backend()
  );
}

function backendCalls(): unknown[][] {
  return authFetch.mock.calls.filter(([path]) => path !== PROFILE_PATH);
}

beforeEach(() => {
  authFetch.mockReset();
  revalidatePath.mockReset();
  getServerAuthToken.mockReset();
  getServerAuthToken.mockResolvedValue('su-token');
});

const params = { params: Promise.resolve({ slug: 'help' }) };

function request(method: string, site = 'same-origin'): NextRequest {
  return new NextRequest('http://site.test/api/menu-headings/help', {
    method,
    headers: { 'sec-fetch-site': site },
    body: method === 'GET' || method === 'DELETE' ? undefined : '{"title":{"en":"Help"}}',
  });
}

const writes = [
  ['POST /api/menu-headings', () => POST(request('POST'))],
  ['PATCH /api/menu-headings/[slug]', () => PATCH(request('PATCH'), params)],
  ['DELETE /api/menu-headings/[slug]', () => DELETE(request('DELETE'), params)],
] as const;

const reads = [
  ['GET /api/menu-headings', () => LIST()],
  ['GET /api/menu-headings/[slug]', () => GET(request('GET'), params)],
] as const;

describe('menu-heading writes from another origin', () => {
  it.each([
    ['POST /api/menu-headings', () => POST(request('POST', 'cross-site'))],
    ['PATCH /api/menu-headings/[slug]', () => PATCH(request('PATCH', 'cross-site'), params)],
    ['DELETE /api/menu-headings/[slug]', () => DELETE(request('DELETE', 'cross-site'), params)],
  ])('%s is refused without reading the token or calling the backend', async (_label, call) => {
    const response = await call();

    expect(response.status).toBe(403);
    expect(getServerAuthToken).not.toHaveBeenCalled();
    expect(authFetch).not.toHaveBeenCalled();
  });
});

describe('menu-heading routes without a superuser', () => {
  it.each([...reads, ...writes])('%s answers 401 without a token', async (_label, call) => {
    getServerAuthToken.mockResolvedValue(null);

    const response = await call();

    expect(response.status).toBe(401);
    expect(authFetch).not.toHaveBeenCalled();
  });

  it.each([...reads, ...writes])('%s answers 403 to a non-superuser', async (_label, call) => {
    backendReplies(() => json({}), false);

    const response = await call();

    expect(response.status).toBe(403);
    expect(backendCalls()).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('menu-heading writes as a superuser', () => {
  it('POST creates the heading and revalidates the layout', async () => {
    backendReplies(() => json({ id: 1, slug: 'help' }, 201));

    const response = await POST(request('POST'));

    expect(response.status).toBe(201);
    expect(backendCalls()[0][0]).toBe('/api/v1/management/menu-headings/');
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  it('PATCH updates the heading by slug and revalidates the layout', async () => {
    backendReplies(() => json({ id: 1, slug: 'help' }));

    const response = await PATCH(request('PATCH'), params);

    expect(response.status).toBe(200);
    expect(backendCalls()[0][0]).toBe('/api/v1/management/menu-headings/help/');
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  it('DELETE answers 204 and revalidates the layout', async () => {
    backendReplies(() => new Response(null, { status: 204 }));

    const response = await DELETE(request('DELETE'), params);

    expect(response.status).toBe(204);
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  it.each(writes)('%s passes a backend error through without revalidating', async (_l, call) => {
    backendReplies(() => json({ slug: ['Already exists.'] }, 400));

    const response = await call();

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ slug: ['Already exists.'] });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('POST refuses a body that is not JSON', async () => {
    backendReplies(() => json({}));

    const response = await POST(
      new NextRequest('http://site.test/api/menu-headings', {
        method: 'POST',
        headers: { 'sec-fetch-site': 'same-origin' },
        body: 'not json',
      })
    );

    expect(response.status).toBe(400);
    expect(backendCalls()).toEqual([]);
  });
});
