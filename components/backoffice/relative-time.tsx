'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useSyncExternalStore } from 'react';

// One shared minute-tick clock, so N mounted rows share one interval that
// only runs while at least one of them is on screen.
const minuteListeners = new Set<() => void>();
let minuteIntervalId: ReturnType<typeof setInterval> | null = null;
function subscribeMinute(cb: () => void) {
  minuteListeners.add(cb);
  if (minuteIntervalId === null) {
    minuteIntervalId = setInterval(() => {
      for (const listener of minuteListeners) listener();
    }, 60_000);
  }
  return () => {
    minuteListeners.delete(cb);
    if (minuteListeners.size === 0 && minuteIntervalId !== null) {
      clearInterval(minuteIntervalId);
      minuteIntervalId = null;
    }
  };
}
function getMinute() {
  return Math.floor(Date.now() / 60_000);
}

/** "3m ago" / "2d ago" for a recent timestamp, the plain date beyond a week; re-renders each minute. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const t = useTranslations('backoffice.texts.relative');
  const minute = useSyncExternalStore(
    subscribeMinute,
    getMinute,
    () => 0 // SSR snapshot: render the absolute date.
  );
  const label = useMemo(() => {
    if (minute === 0) return new Date(iso).toLocaleDateString();
    const diffMin = minute - Math.floor(new Date(iso).getTime() / 60_000);
    if (diffMin < 1) return t('justNow');
    if (diffMin < 60) return t('minutesAgo', { count: diffMin });
    if (diffMin < 60 * 24) return t('hoursAgo', { count: Math.round(diffMin / 60) });
    if (diffMin < 60 * 24 * 7) return t('daysAgo', { count: Math.round(diffMin / (60 * 24)) });
    return new Date(iso).toLocaleDateString();
  }, [iso, minute, t]);
  return (
    <span className={className} title={new Date(iso).toLocaleString()}>
      {label}
    </span>
  );
}
