/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NotificationsPopover } from './notifications-popover';
import type { Notification } from '@/lib/backoffice/pending-notifications';

const NOW = 1_700_000_000_000;

function n(overrides: Partial<Notification>): Notification {
  return {
    id: 'n1',
    kind: 'review-assigned',
    createdAt: NOW - 60_000,
    readAt: null,
    ...overrides,
  };
}

const SAMPLE: Notification[] = [
  n({ id: 'a', kind: 'review-assigned' }),
  n({ id: 'b', kind: 'comment-reply' }),
  n({ id: 'c', kind: 'mention', readAt: NOW - 30_000 }),
];

describe('<NotificationsPopover>', () => {
  it('renders an empty-state copy when there are no notifications', () => {
    render(
      <NotificationsPopover
        notifications={[]}
        onMarkAllRead={vi.fn()}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        now={NOW}
      />
    );
    expect(screen.getByText(/all caught up/i)).toBeTruthy();
  });

  it('shows the unread count in the header', () => {
    render(
      <NotificationsPopover
        notifications={SAMPLE}
        onMarkAllRead={vi.fn()}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        now={NOW}
      />
    );
    // 2 unread (a, b) — c is read.
    expect(screen.getByText(/2 unread/i)).toBeTruthy();
  });

  it('groups notifications by kind', () => {
    const { container } = render(
      <NotificationsPopover
        notifications={SAMPLE}
        onMarkAllRead={vi.fn()}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        now={NOW}
      />
    );
    const groups = container.querySelectorAll('[data-notification-kind]');
    const kinds = Array.from(groups).map((g) => g.getAttribute('data-notification-kind'));
    expect(kinds).toContain('review-assigned');
    expect(kinds).toContain('comment-reply');
    expect(kinds).toContain('mention');
  });

  it('clicking a row fires onSelect with the notification', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <NotificationsPopover
        notifications={SAMPLE}
        onMarkAllRead={vi.fn()}
        onSelect={onSelect}
        onClose={vi.fn()}
        now={NOW}
      />
    );
    const row = container.querySelector('[data-notification-id="a"]') as HTMLElement;
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].id).toBe('a');
  });

  it('mark-all-read fires onMarkAllRead', () => {
    const onMarkAllRead = vi.fn();
    render(
      <NotificationsPopover
        notifications={SAMPLE}
        onMarkAllRead={onMarkAllRead}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        now={NOW}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /mark all as read/i }));
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('mark-all-read is disabled when nothing is unread', () => {
    render(
      <NotificationsPopover
        notifications={[n({ readAt: NOW })]}
        onMarkAllRead={vi.fn()}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        now={NOW}
      />
    );
    expect(screen.getByRole('button', { name: /mark all as read/i }).hasAttribute('disabled')).toBe(
      true
    );
  });

  it('paints unread rows differently from read rows', () => {
    const { container } = render(
      <NotificationsPopover
        notifications={SAMPLE}
        onMarkAllRead={vi.fn()}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        now={NOW}
      />
    );
    const unread = container.querySelector('[data-notification-id="a"]') as HTMLElement;
    const read = container.querySelector('[data-notification-id="c"]') as HTMLElement;
    expect(unread.dataset.read).toBe('false');
    expect(read.dataset.read).toBe('true');
  });

  it('close button fires onClose', () => {
    const onClose = vi.fn();
    render(
      <NotificationsPopover
        notifications={SAMPLE}
        onMarkAllRead={vi.fn()}
        onSelect={vi.fn()}
        onClose={onClose}
        now={NOW}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /close notifications/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
