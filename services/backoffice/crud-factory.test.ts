import { describe, expect, it, vi } from 'vitest';

// Mock the api-client primitives so we can capture exactly what URL/path the
// factory composes. Each spy returns a resolved value that includes the
// arguments it was called with — that's enough to verify the contract.
vi.mock('./api-client', () => {
  const get = vi.fn(async (path: string) => ({ kind: 'get', path }));
  const post = vi.fn(async (path: string, _token: string, data: unknown) => ({
    kind: 'post',
    path,
    data,
  }));
  const patch = vi.fn(async (path: string, _token: string, data: unknown) => ({
    kind: 'patch',
    path,
    data,
  }));
  const del = vi.fn(async (path: string) => ({ kind: 'delete', path }));
  return {
    backofficeGet: get,
    backofficePost: post,
    backofficePatch: patch,
    backofficeDelete: del,
  };
});

import { createCrudService } from './crud-factory';

const BASE = '/api/v1/manuscripts/management/historical-items/';
const service = createCrudService<{ id: number; name: string }>(BASE);

describe('createCrudService.list', () => {
  it('returns the bare base path when no params are supplied', async () => {
    const res = (await service.list('tok')) as unknown as { path: string };
    expect(res.path).toBe(BASE);
  });

  it('appends ?key=value query parameters', async () => {
    const res = (await service.list('tok', { search: 'magna' })) as unknown as { path: string };
    expect(res.path).toBe(`${BASE}?search=magna`);
  });

  it('coerces number / boolean params to their string form', async () => {
    const res = (await service.list('tok', {
      limit: 20,
      offset: 0,
      published: true,
    })) as unknown as { path: string };
    const url = new URL(`http://x${res.path}`);
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.get('offset')).toBe('0');
    expect(url.searchParams.get('published')).toBe('true');
  });

  it('skips undefined / null values entirely (not stringified as "undefined")', async () => {
    const res = (await service.list('tok', {
      search: 'magna',
      // common pattern when the form hasn't been touched:
      orderBy: undefined,
      filter: null,
    })) as unknown as { path: string };
    const url = new URL(`http://x${res.path}`);
    expect(url.searchParams.get('search')).toBe('magna');
    expect(url.searchParams.has('orderBy')).toBe(false);
    expect(url.searchParams.has('filter')).toBe(false);
  });

  it('keeps the base path unchanged when every param is null/undefined', async () => {
    const res = (await service.list('tok', {
      orderBy: undefined,
      filter: null,
    })) as unknown as { path: string };
    expect(res.path).toBe(BASE);
  });
});

describe('createCrudService item operations', () => {
  it('get builds `${base}${id}/`', async () => {
    const res = (await service.get('tok', 42)) as unknown as { path: string };
    expect(res.path).toBe(`${BASE}42/`);
  });

  it('create posts to the base path', async () => {
    const res = (await service.create('tok', { name: 'Foo' })) as unknown as {
      path: string;
      data: unknown;
    };
    expect(res.path).toBe(BASE);
    expect(res.data).toEqual({ name: 'Foo' });
  });

  it('update patches `${base}${id}/`', async () => {
    const res = (await service.update('tok', 7, { name: 'Bar' })) as unknown as {
      path: string;
      data: unknown;
    };
    expect(res.path).toBe(`${BASE}7/`);
    expect(res.data).toEqual({ name: 'Bar' });
  });

  it('remove deletes `${base}${id}/`', async () => {
    const res = (await service.remove('tok', 7)) as unknown as { path: string };
    expect(res.path).toBe(`${BASE}7/`);
  });

  it('supports string-typed ids (slugs / non-numeric pks)', async () => {
    const slugService = createCrudService<{ slug: string }, { slug: string }, string>(
      '/api/v1/publications/management/posts/'
    );
    const res = (await slugService.get('tok', 'my-post')) as unknown as { path: string };
    expect(res.path).toBe('/api/v1/publications/management/posts/my-post/');
  });
});
