/**
 * Phase 7.1 of ROADMAP-EDITORS-V2 — pure SLA / assignment helpers for
 * the reviewer queue.
 *
 * The backoffice review queue already lists items waiting on a
 * reviewer; this phase adds **age** and **assignment** affordances:
 *
 *   - How long has this item been in review? (`ageInReviewMs` /
 *     `formatReviewAge`).
 *   - At what point does it cross the warning / overdue threshold?
 *     (`slaSeverity`, with sensible defaults of 3 / 7 days).
 *   - Who's it assigned to, and how many are still unclaimed?
 *     (`groupByAssignee`, `unassignedCount`).
 *   - The default sort is "oldest first", surfacing the items that
 *     have been sitting longest.
 *
 * No localStorage, no fetch — wiring lives in the page-level component.
 */

export interface ReviewAssignee {
  userId: number;
  username: string;
}

export type ReviewItemStatus = 'draft' | 'review' | 'live';

export interface ReviewQueueItem {
  id: number;
  status: ReviewItemStatus;
  /** ms epoch the item entered review; null when the item never has. */
  enteredReviewAt: number | null;
  assignedTo: ReviewAssignee | null;
}

export type SlaSeverity = 'fresh' | 'warning' | 'overdue';

export interface SlaThresholds {
  warningMs: number;
  overdueMs: number;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const DEFAULT_THRESHOLDS: SlaThresholds = {
  warningMs: 3 * DAY,
  overdueMs: 7 * DAY,
};

export function ageInReviewMs(item: ReviewQueueItem, now: number = Date.now()): number | null {
  if (item.status !== 'review') return null;
  if (item.enteredReviewAt === null) return null;
  return Math.max(0, now - item.enteredReviewAt);
}

export function formatReviewAge(ms: number): string {
  if (ms <= 0) return 'today';
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h`;
  if (ms < WEEK) return `${Math.floor(ms / DAY)}d`;
  return `${Math.floor(ms / WEEK)}w`;
}

export function slaSeverity(
  ms: number | null,
  thresholds: SlaThresholds = DEFAULT_THRESHOLDS
): SlaSeverity {
  if (ms === null) return 'fresh';
  if (ms >= thresholds.overdueMs) return 'overdue';
  if (ms >= thresholds.warningMs) return 'warning';
  return 'fresh';
}

/**
 * Sort items by oldest-in-review first. Items not in review (or with
 * no `enteredReviewAt`) sink to the end so the queue surface stays
 * focused on actionable rows.
 */
export function sortByOldestInReview(
  items: ReviewQueueItem[],
  now: number = Date.now()
): ReviewQueueItem[] {
  const out = [...items];
  out.sort((a, b) => {
    const ageA = ageInReviewMs(a, now);
    const ageB = ageInReviewMs(b, now);
    if (ageA === null && ageB === null) return 0;
    if (ageA === null) return 1;
    if (ageB === null) return -1;
    return ageB - ageA;
  });
  return out;
}

export function groupByAssignee(items: ReviewQueueItem[]): Map<number, ReviewQueueItem[]> {
  const out = new Map<number, ReviewQueueItem[]>();
  for (const item of items) {
    if (!item.assignedTo) continue;
    const list = out.get(item.assignedTo.userId);
    if (list) list.push(item);
    else out.set(item.assignedTo.userId, [item]);
  }
  return out;
}

export function unassignedCount(items: ReviewQueueItem[]): number {
  let n = 0;
  for (const item of items) if (!item.assignedTo) n++;
  return n;
}
