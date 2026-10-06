import { describe, expect, it } from 'vitest';
import { getPageTokens } from './pagination';

describe('getPageTokens', () => {
  it('handles small total pages without ellipsis', () => {
    expect(getPageTokens(1, 0)).toEqual([]);
    expect(getPageTokens(1, 1)).toEqual([1]);
    expect(getPageTokens(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageTokens(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('matches exact window tokens for 49 pages', () => {
    expect(getPageTokens(1, 49)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 49]);
    expect(getPageTokens(3, 49)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 49]);
    expect(getPageTokens(5, 49)).toEqual([1, 'ellipsis-start', 4, 5, 6, 'ellipsis-end', 49]);
    expect(getPageTokens(45, 49)).toEqual([1, 'ellipsis-start', 44, 45, 46, 'ellipsis-end', 49]);
    expect(getPageTokens(47, 49)).toEqual([1, 'ellipsis-start', 45, 46, 47, 48, 49]);
    expect(getPageTokens(49, 49)).toEqual([1, 'ellipsis-start', 45, 46, 47, 48, 49]);
  });

  it('shows the page number instead of an ellipsis that would hide only one page', () => {
    expect(getPageTokens(4, 49)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 49]);
    expect(getPageTokens(46, 49)).toEqual([1, 'ellipsis-start', 45, 46, 47, 48, 49]);
  });

  it('clamps out-of-bounds page numbers', () => {
    expect(getPageTokens(0, 49)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 49]);
    expect(getPageTokens(-10, 49)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 49]);
    expect(getPageTokens(100, 49)).toEqual([1, 'ellipsis-start', 45, 46, 47, 48, 49]);
  });

  it('supports custom sibling count', () => {
    expect(getPageTokens(10, 20, 2)).toEqual([
      1,
      'ellipsis-start',
      8,
      9,
      10,
      11,
      12,
      'ellipsis-end',
      20,
    ]);
  });
});
