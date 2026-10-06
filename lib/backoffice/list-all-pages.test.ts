import { describe, expect, it, vi } from 'vitest';

import { listAllPages } from './list-all-pages';

function page(results: number[], count: number) {
  return { count, next: null, previous: null, results };
}

describe('listAllPages', () => {
  it('reads pages of 100 until the count is reached', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce(
        page(
          Array.from({ length: 100 }, (_, i) => i),
          150
        )
      )
      .mockResolvedValueOnce(
        page(
          Array.from({ length: 50 }, (_, i) => 100 + i),
          150
        )
      );

    const rows = await listAllPages(list);

    expect(rows).toHaveLength(150);
    expect(list.mock.calls).toEqual([[{ limit: 100, offset: 0 }], [{ limit: 100, offset: 100 }]]);
  });

  it('stops on an empty page even if the count says more', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce(page([1, 2], 5))
      .mockResolvedValueOnce(page([], 5));

    expect(await listAllPages(list)).toEqual([1, 2]);
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('rejects when a page fails', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce(
        page(
          Array.from({ length: 100 }, (_, i) => i),
          150
        )
      )
      .mockRejectedValueOnce(new Error('502'));

    await expect(listAllPages(list)).rejects.toThrow('502');
  });
});
