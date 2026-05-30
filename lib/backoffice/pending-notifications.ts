/**
 * Phase 7.1 of ROADMAP-EDITORS-V2 — pure things-waiting-on-me helpers.
 *
 * The backoffice header gets a notification icon with a count of unread items:
 * assigned reviews, comment replies you're tagged in, and direct @mentions.
 * This module owns the pure counting and grouping; the API layer fetches
 * notifications and keeps them in sync.
 *
 * Notifications are append-only: either unread (`readAt: null`) or read
 * (timestamp of when the user dismissed them).
 */

export type NotificationKind = 'review-assigned' | 'comment-reply' | 'mention';

const NOTIFICATION_KINDS: NotificationKind[] = ['review-assigned', 'comment-reply', 'mention'];

export interface Notification {
  id: string;
  kind: NotificationKind;
  /** ms epoch. */
  createdAt: number;
  /** ms epoch when the user dismissed this notification, or null when unread. */
  readAt: number | null;
}

export function unreadCount(notifications: Notification[]): number {
  let n = 0;
  for (const x of notifications) if (x.readAt === null) n++;
  return n;
}

export function groupByKind(
  notifications: Notification[]
): Record<NotificationKind, Notification[]> {
  const out = {} as Record<NotificationKind, Notification[]>;
  for (const k of NOTIFICATION_KINDS) out[k] = [];
  for (const x of notifications) out[x.kind].push(x);
  return out;
}
