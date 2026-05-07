import { describe, expect, it } from 'vitest';

import {
  ageInReviewMs,
  formatReviewAge,
  slaSeverity,
  sortByOldestInReview,
  groupByAssignee,
  unassignedCount,
  type ReviewQueueItem,
  type ReviewAssignee,
} from './review-queue-sla';

const ALICE: ReviewAssignee = { userId: 1, username: 'alice' };
const BOB: ReviewAssignee = { userId: 2, username: 'bob' };

const NOW = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function item(overrides: Partial<ReviewQueueItem>): ReviewQueueItem {
  return {
    id: 1,
    status: 'review',
    enteredReviewAt: NOW - 2 * DAY,
    assignedTo: null,
    ...overrides,
  };
}

describe('ageInReviewMs', () => {
  it('returns the delta between now and enteredReviewAt', () => {
    expect(ageInReviewMs(item({ enteredReviewAt: NOW - DAY }), NOW)).toBe(DAY);
  });

  it('returns null for items not in review', () => {
    expect(ageInReviewMs(item({ status: 'draft', enteredReviewAt: NOW - DAY }), NOW)).toBeNull();
  });

  it('returns null when enteredReviewAt is null', () => {
    expect(ageInReviewMs(item({ enteredReviewAt: null }), NOW)).toBeNull();
  });

  it('clamps negative deltas to 0', () => {
    expect(ageInReviewMs(item({ enteredReviewAt: NOW + DAY }), NOW)).toBe(0);
  });
});

describe('formatReviewAge', () => {
  it('reports zero as "today"', () => {
    expect(formatReviewAge(0)).toBe('today');
  });

  it('hours / days / weeks at the right boundaries', () => {
    expect(formatReviewAge(2 * HOUR)).toBe('2h');
    expect(formatReviewAge(2 * DAY)).toBe('2d');
    expect(formatReviewAge(8 * DAY)).toBe('1w');
    expect(formatReviewAge(15 * DAY)).toBe('2w');
  });
});

describe('slaSeverity', () => {
  it('classifies fresh / warning / overdue at default thresholds', () => {
    // Defaults: warning ≥ 3 days, overdue ≥ 7 days.
    expect(slaSeverity(2 * DAY)).toBe('fresh');
    expect(slaSeverity(3 * DAY)).toBe('warning');
    expect(slaSeverity(6 * DAY)).toBe('warning');
    expect(slaSeverity(7 * DAY)).toBe('overdue');
    expect(slaSeverity(30 * DAY)).toBe('overdue');
  });

  it('respects custom thresholds', () => {
    const custom = { warningMs: HOUR, overdueMs: 4 * HOUR };
    expect(slaSeverity(30 * 60 * 1000, custom)).toBe('fresh');
    expect(slaSeverity(2 * HOUR, custom)).toBe('warning');
    expect(slaSeverity(4 * HOUR, custom)).toBe('overdue');
  });

  it('treats null age as fresh', () => {
    expect(slaSeverity(null)).toBe('fresh');
  });
});

describe('sortByOldestInReview', () => {
  it('puts the oldest review item first; non-review items sink to the end', () => {
    const a = item({ id: 1, enteredReviewAt: NOW - 5 * DAY });
    const b = item({ id: 2, enteredReviewAt: NOW - DAY });
    const c = item({ id: 3, enteredReviewAt: NOW - 10 * DAY });
    const d = item({ id: 4, status: 'draft', enteredReviewAt: null });
    const sorted = sortByOldestInReview([b, d, a, c], NOW);
    expect(sorted.map((i) => i.id)).toEqual([3, 1, 2, 4]);
  });

  it('does not mutate the input array', () => {
    const a = item({ id: 1, enteredReviewAt: NOW - DAY });
    const b = item({ id: 2, enteredReviewAt: NOW - 2 * DAY });
    const buf = [a, b];
    sortByOldestInReview(buf, NOW);
    expect(buf).toEqual([a, b]);
  });
});

describe('groupByAssignee / unassignedCount', () => {
  const a = item({ id: 1, assignedTo: ALICE });
  const b = item({ id: 2, assignedTo: ALICE });
  const c = item({ id: 3, assignedTo: BOB });
  const d = item({ id: 4, assignedTo: null });

  it('groups by assignee userId', () => {
    const groups = groupByAssignee([a, b, c, d]);
    expect(groups.get(1)?.map((i) => i.id)).toEqual([1, 2]);
    expect(groups.get(2)?.map((i) => i.id)).toEqual([3]);
  });

  it('counts unassigned items separately', () => {
    expect(unassignedCount([a, b, c, d])).toBe(1);
    expect(unassignedCount([a, b, c])).toBe(0);
  });
});
