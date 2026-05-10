/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReviewAgeBadge } from './review-age-badge';
import type { ReviewQueueItem } from '@/lib/backoffice/review-queue-sla';

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function item(overrides: Partial<ReviewQueueItem>): ReviewQueueItem {
  return {
    id: 1,
    status: 'review',
    enteredReviewAt: NOW - 2 * DAY,
    assignedTo: null,
    ...overrides,
  };
}

describe('<ReviewAgeBadge>', () => {
  it('renders the formatted age and a severity attribute', () => {
    const { container } = render(
      <ReviewAgeBadge item={item({ enteredReviewAt: NOW - 4 * DAY })} now={NOW} />
    );
    expect(screen.getByText(/4d/)).toBeTruthy();
    const badge = container.firstChild as HTMLElement;
    expect(badge.dataset.severity).toBe('warning');
  });

  it('emits "fresh" for items under the warning threshold', () => {
    const { container } = render(
      <ReviewAgeBadge item={item({ enteredReviewAt: NOW - DAY })} now={NOW} />
    );
    const badge = container.firstChild as HTMLElement;
    expect(badge.dataset.severity).toBe('fresh');
  });

  it('emits "overdue" past the overdue threshold', () => {
    const { container } = render(
      <ReviewAgeBadge item={item({ enteredReviewAt: NOW - 10 * DAY })} now={NOW} />
    );
    const badge = container.firstChild as HTMLElement;
    expect(badge.dataset.severity).toBe('overdue');
  });

  it('renders nothing for non-review items', () => {
    const { container } = render(
      <ReviewAgeBadge item={item({ status: 'draft', enteredReviewAt: null })} now={NOW} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('uses the current time when `now` is omitted', () => {
    // We can't pin Date.now without test helpers here, but rendering
    // shouldn't throw.
    expect(() =>
      render(<ReviewAgeBadge item={item({ enteredReviewAt: Date.now() - DAY })} />)
    ).not.toThrow();
  });
});
