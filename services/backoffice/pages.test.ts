/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse } from '@/test/responses';
import { createPage, deleteMenuHeading, getMenuHeadings, getPages, updatePage } from './pages';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => jsonResponse([]));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const call = (n = 0) => {
  const [url, init] = fetchMock.mock.calls[n];
  return { url, method: init?.method ?? 'GET', body: init?.body && JSON.parse(init.body) };
};

describe('backoffice pages service', () => {
  it("reads pages and headings from Django's management endpoints through the proxy", async () => {
    await getPages();
    await getMenuHeadings();

    expect(call(0).url).toBe('/api/proxy/api/v1/management/pages');
    expect(call(1).url).toBe('/api/proxy/api/v1/management/menu-headings');
  });

  it('writes a page by its slug, encoded', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ slug: 'a b' }));
    await createPage({ slug: 'a b' });
    await updatePage('a b', { order: 2 });

    expect(call(0)).toEqual({
      url: '/api/proxy/api/v1/management/pages',
      method: 'POST',
      body: { slug: 'a b' },
    });
    expect(call(1)).toEqual({
      url: '/api/proxy/api/v1/management/pages/a%20b',
      method: 'PATCH',
      body: { order: 2 },
    });
  });

  it('deletes a heading and accepts the empty 204', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteMenuHeading('help')).resolves.toBeUndefined();
    expect(call()).toMatchObject({
      url: '/api/proxy/api/v1/management/menu-headings/help',
      method: 'DELETE',
    });
  });
});
