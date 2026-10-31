import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RelativeTime } from './relative-time';

const NOW = new Date('2026-10-31T12:00:00Z');

function minutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

describe('<RelativeTime>', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    [0, 'just now'],
    [3, '3m ago'],
    [120, '2h ago'],
    [60 * 24 * 2, '2d ago'],
  ])('%i minutes ago reads "%s"', (minutes, label) => {
    render(<RelativeTime iso={minutesAgo(minutes)} />);
    expect(screen.getByText(label)).toBeTruthy();
  });

  it('falls back to the plain date beyond a week', () => {
    const iso = minutesAgo(60 * 24 * 10);
    render(<RelativeTime iso={iso} />);
    expect(screen.getByText(new Date(iso).toLocaleDateString())).toBeTruthy();
  });

  it('carries the absolute time as a title and ticks forward each minute', () => {
    const iso = minutesAgo(1);
    render(<RelativeTime iso={iso} />);
    const span = screen.getByText('1m ago');
    expect(span.getAttribute('title')).toBe(new Date(iso).toLocaleString());

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText('2m ago')).toBeTruthy();
  });
});
