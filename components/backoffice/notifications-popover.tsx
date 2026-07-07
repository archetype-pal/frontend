'use client';

/**
 * Phase 7.1 of ROADMAP-EDITORS-V2 — backoffice notifications popover.
 *
 * Header bell opens this; content groups the cycle-232 notifications
 * by kind and surfaces an aggregate "N unread" count plus a "Mark all
 * as read" action. Each row is a click-target so the host can route
 * the user to the relevant page (review queue, comment thread,
 * mentioned span).
 *
 * Presentational only — `onMarkAllRead`, `onSelect`, `onClose` lift
 * state to the host.
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AtSign, Bell, ClipboardCheck, MessageSquare, X } from 'lucide-react';

import {
  groupByKind,
  unreadCount,
  type Notification,
  type NotificationKind,
} from '@/lib/backoffice/pending-notifications';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Inlined here so this PR doesn't pull in the editor's draft-history
// module just for the relative-time formatter.
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
function describeSnapshotAge(timestamp: number, now: number = Date.now()): string {
  const delta = Math.max(0, now - timestamp);
  if (delta < SECOND) return 'just now';
  if (delta < MINUTE) return `${Math.floor(delta / SECOND)}s ago`;
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)}m ago`;
  if (delta < DAY) return `${Math.floor(delta / HOUR)}h ago`;
  return `${Math.floor(delta / DAY)}d ago`;
}

const KIND_ICON: Record<NotificationKind, React.ComponentType<{ className?: string }>> = {
  'review-assigned': ClipboardCheck,
  'comment-reply': MessageSquare,
  mention: AtSign,
};

const KIND_ORDER: NotificationKind[] = ['review-assigned', 'comment-reply', 'mention'];

export interface NotificationsPopoverProps {
  notifications: Notification[];
  onMarkAllRead: () => void;
  onSelect: (notification: Notification) => void;
  onClose: () => void;
  /** Override "now" for stable tests. */
  now?: number;
  className?: string;
}

interface RowProps {
  notification: Notification;
  onSelect: (n: Notification) => void;
  now?: number;
  kindLabel: Record<NotificationKind, string>;
}

function NotificationRow({ notification, onSelect, now, kindLabel }: RowProps) {
  const Icon = KIND_ICON[notification.kind];
  const read = notification.readAt !== null;
  return (
    <li>
      <button
        type="button"
        data-notification-id={notification.id}
        data-read={read}
        onClick={() => onSelect(notification)}
        className={cn(
          'flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
          read ? 'opacity-70 hover:bg-muted/30' : 'hover:bg-muted/40'
        )}
      >
        <span
          aria-hidden
          className={cn(
            'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
            read
              ? 'bg-muted text-muted-foreground'
              : 'bg-severity-warning/20 text-[hsl(var(--c-severity-warning-h)_var(--c-severity-warning-s)_25%)] dark:bg-severity-warning/30 dark:text-[hsl(var(--c-severity-warning-h)_var(--c-severity-warning-s)_85%)]'
          )}
        >
          <Icon className="h-3 w-3" />
        </span>
        <span className="flex-1 truncate">{kindLabel[notification.kind]}</span>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {describeSnapshotAge(notification.createdAt, now)}
        </span>
      </button>
    </li>
  );
}

export function NotificationsPopover({
  notifications,
  onMarkAllRead,
  onSelect,
  onClose,
  now,
  className,
}: NotificationsPopoverProps) {
  const t = useTranslations('backoffice');
  const kindLabel: Record<NotificationKind, string> = {
    'review-assigned': t('notifications.kindReviewAssigned'),
    'comment-reply': t('notifications.kindCommentReply'),
    mention: t('notifications.kindMention'),
  };
  const unread = unreadCount(notifications);
  const groups = groupByKind(notifications);

  return (
    <div
      role="dialog"
      aria-label={t('notifications.ariaLabel')}
      data-testid="notifications-popover"
      className={cn(
        'flex w-80 flex-col gap-2 rounded-md border bg-background p-2 shadow-lg',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b pb-1.5">
        <div className="flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('notifications.unread', { count: unread })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            disabled={unread === 0}
            onClick={onMarkAllRead}
          >
            {t('notifications.markAllRead')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
            aria-label={t('notifications.closeLabel')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <p className="px-2 py-4 text-center text-xs italic text-muted-foreground">
          {t('notifications.allCaughtUp')}
        </p>
      ) : (
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {KIND_ORDER.map((kind) => {
            const items = groups[kind];
            if (items.length === 0) return null;
            return (
              <section key={kind} data-notification-kind={kind}>
                <h4 className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {kindLabel[kind]}
                </h4>
                <ul className="flex flex-col gap-0.5">
                  {items.map((it) => (
                    <NotificationRow
                      key={it.id}
                      notification={it}
                      onSelect={onSelect}
                      now={now}
                      kindLabel={kindLabel}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
