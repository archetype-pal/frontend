import { describe, expect, it } from 'vitest';

import { getDefaultHand, sortHandsByPriority } from './hand-ordering';
import type { HandType } from '@/types/hands';

function hand(overrides: Partial<HandType>): HandType {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? 'Hand',
    scribe: 1,
    item_part: 1,
    date: '',
    place: '',
    description: '',
    ...overrides,
  };
}

describe('hand ordering', () => {
  it('uses legacy num as ascending display order', () => {
    const sorted = sortHandsByPriority([
      hand({ id: 3, name: 'C', num: 3 }),
      hand({ id: 1, name: 'A', num: 1 }),
      hand({ id: 2, name: 'B', num: 2 }),
    ]);

    expect(sorted.map((h) => h.id)).toEqual([1, 2, 3]);
  });

  it('prefers explicit default and priority before display order', () => {
    const sorted = sortHandsByPriority([
      hand({ id: 1, name: 'Order first', num: 1 }),
      hand({ id: 2, name: 'Priority', num: 9, priority: 10 }),
      hand({ id: 3, name: 'Default', num: 20, is_default: true }),
    ]);

    expect(sorted.map((h) => h.id)).toEqual([3, 2, 1]);
    expect(getDefaultHand(sorted)?.id).toBe(3);
  });

  it('falls back to natural name sorting for unordered hands', () => {
    const sorted = sortHandsByPriority([
      hand({ id: 3, name: 'Hand 10' }),
      hand({ id: 1, name: 'Hand 2' }),
      hand({ id: 2, name: 'Hand 1' }),
    ]);

    expect(sorted.map((h) => h.name)).toEqual(['Hand 1', 'Hand 2', 'Hand 10']);
  });
});
