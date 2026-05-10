import { describe, expect, it } from 'vitest';

import { backofficeKeys } from './query-keys';

describe('backofficeKeys structure', () => {
  it('namespaces every entity under the "backoffice" root', () => {
    expect(backofficeKeys.all).toEqual(['backoffice']);
    expect(backofficeKeys.manuscripts.all()[0]).toBe('backoffice');
    expect(backofficeKeys.scribes.all()[0]).toBe('backoffice');
    expect(backofficeKeys.publications.all()[0]).toBe('backoffice');
    expect(backofficeKeys.users.all()[0]).toBe('backoffice');
    expect(backofficeKeys.searchEngine.all()[0]).toBe('backoffice');
  });

  it('encodes the entity name as the second segment for `all()`', () => {
    expect(backofficeKeys.manuscripts.all()).toEqual(['backoffice', 'manuscripts']);
    expect(backofficeKeys.scribes.all()).toEqual(['backoffice', 'scribes']);
    expect(backofficeKeys.publications.all()).toEqual(['backoffice', 'publications']);
  });

  it('list keys extend their entity-all() so invalidate(all) covers list', () => {
    // Critical invariant — `queryClient.invalidateQueries({ queryKey: scribes.all() })`
    // must invalidate `scribes.list()` and `scribes.detail(id)`. TanStack Query's
    // partial-prefix matching depends on lists/details starting with the same
    // tuple as `.all()`.
    const all = backofficeKeys.scribes.all();
    const list = backofficeKeys.scribes.list();
    const detail = backofficeKeys.scribes.detail(7);
    expect(list.slice(0, all.length)).toEqual([...all]);
    expect(detail.slice(0, all.length)).toEqual([...all]);
  });

  it('manuscripts.list embeds filter object as the trailing segment', () => {
    const filters = { offset: 20, type: 'charter' };
    const key = backofficeKeys.manuscripts.list(filters);
    expect(key[key.length - 1]).toBe(filters);
    expect(key.slice(0, 3)).toEqual(['backoffice', 'manuscripts', 'list']);
  });

  it('detail keys include the id as the trailing segment', () => {
    expect(backofficeKeys.manuscripts.detail(42)).toEqual([
      'backoffice',
      'manuscripts',
      'detail',
      42,
    ]);
    expect(backofficeKeys.scribes.detail(7)).toEqual(['backoffice', 'scribes', 'detail', 7]);
    expect(backofficeKeys.users.detail(1)).toEqual(['backoffice', 'users', 'detail', 1]);
  });

  it('publications.detail uses slug (string) instead of numeric id', () => {
    expect(backofficeKeys.publications.detail('my-post')).toEqual([
      'backoffice',
      'publications',
      'detail',
      'my-post',
    ]);
  });

  it('produces distinct keys for different filter objects (cache isolation)', () => {
    const a = backofficeKeys.manuscripts.list({ offset: 0 });
    const b = backofficeKeys.manuscripts.list({ offset: 20 });
    expect(a).not.toEqual(b);
  });

  it('currentItems.list still extends its all() despite the inlined construction', () => {
    // The source builds list() as [...all, 'currentItems', 'list', filters] inline
    // rather than [...currentItems.all(), 'list', filters]. The assertion locks in
    // that the resulting key still starts with the all() prefix so invalidation works.
    const all = backofficeKeys.currentItems.all();
    const list = backofficeKeys.currentItems.list({});
    expect(list.slice(0, all.length)).toEqual([...all]);
  });

  it('graphs.list and graphs.detail extend graphs.all() (inline construction)', () => {
    const all = backofficeKeys.graphs.all();
    expect(backofficeKeys.graphs.list({}).slice(0, all.length)).toEqual([...all]);
    expect(backofficeKeys.graphs.detail(1).slice(0, all.length)).toEqual([...all]);
  });

  it('searchEngine.stats and searchEngine.task extend searchEngine.all()', () => {
    const all = backofficeKeys.searchEngine.all();
    expect(backofficeKeys.searchEngine.stats().slice(0, all.length)).toEqual([...all]);
    expect(backofficeKeys.searchEngine.task('abc').slice(0, all.length)).toEqual([...all]);
  });
});
