/**
 * Phase 7.1 of ROADMAP-EDITORS-V2 — pure things-waiting-on-me helper.
 *
 * The backoffice header gets a notification icon with a count of
 * unread items: assigned reviews, comment replies you're tagged in,
 * and direct @mentions. This module owns the pure counting and
 * grouping; the API layer fetches notifications and keeps them in
 * sync.
 *
 * Notifications are append-only: they're either unread (`readAt: null`)
 * or read (timestamp of when the user dismissed them). `markAllRead`
 * and `markKindRead` produce a new list with the appropriate stamps.
 */

export type NotificationKind = 'review-assigned' | 'comment-reply' | 'mention';

export const NOTIFICATION_KINDS: NotificationKind[] = [
  'review-assigned',
  'comment-reply',
  'mention',
];

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

export type UnreadByKind = Record<NotificationKind, number>;

function emptyByKind<T>(value: T): Record<NotificationKind, T> {
  return {
    'review-assigned': value,
    'comment-reply': value,
    mention: value,
  };
}

export function unreadByKind(notifications: Notification[]): UnreadByKind {
  const out: UnreadByKind = emptyByKind(0);
  for (const x of notifications) if (x.readAt === null) out[x.kind] += 1;
  return out;
}

export function groupByKind(
  notifications: Notification[]
): Record<NotificationKind, Notification[]> {
  const out: Record<NotificationKind, Notification[]> = emptyByKind<Notification[]>([]);
  // emptyByKind shares array references, so re-create per kind:
  for (const k of NOTIFICATION_KINDS) out[k] = [];
  for (const x of notifications) out[x.kind].push(x);
  return out;
}

export function markAllRead(
  notifications: Notification[],
  now: number = Date.now()
): Notification[] {
  return notifications.map((x) => (x.readAt === null ? { ...x, readAt: now } : x));
}

export function markKindRead(
  notifications: Notification[],
  kind: NotificationKind,
  now: number = Date.now()
): Notification[] {
  return notifications.map((x) =>
    x.kind === kind && x.readAt === null ? { ...x, readAt: now } : x
  );
}
