export type PageToken = number | 'ellipsis-start' | 'ellipsis-end';

export const PAGE_SIZE_OPTIONS = [20, 50, 100];

export function parsePageSize(raw: string | null, fallback: number): number {
  const size = Number(raw);
  return PAGE_SIZE_OPTIONS.includes(size) ? size : fallback;
}

/** Page tokens in a fixed width of `siblingCount * 2 + 5` slots, ellipses included. */
export function getPageTokens(
  page: number,
  totalPages: number,
  siblingCount: number = 1
): PageToken[] {
  if (totalPages <= 0) return [];

  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const visibleSlots = siblingCount * 2 + 5;

  if (totalPages <= visibleSlots) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const start = Math.max(clampedPage - siblingCount, 2);
  const end = Math.min(clampedPage + siblingCount, totalPages - 1);
  // An ellipsis would hide just one page: show the page instead.
  const showStartEllipsis = start > 3;
  const showEndEllipsis = end < totalPages - 2;

  if (!showStartEllipsis) {
    const count = siblingCount * 2 + 3;
    return [...Array.from({ length: count }, (_, i) => i + 1), 'ellipsis-end', totalPages];
  }

  if (!showEndEllipsis) {
    const count = siblingCount * 2 + 3;
    return [
      1,
      'ellipsis-start',
      ...Array.from({ length: count }, (_, i) => totalPages - count + i + 1),
    ];
  }

  return [
    1,
    'ellipsis-start',
    ...Array.from({ length: end - start + 1 }, (_, i) => start + i),
    'ellipsis-end',
    totalPages,
  ];
}
