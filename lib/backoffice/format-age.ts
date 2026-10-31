const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** A coarse age for list cells: "today", "5h", "3d", "2w". */
export function formatAge(ms: number): string {
  if (ms <= 0) return 'today';
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h`;
  if (ms < WEEK) return `${Math.floor(ms / DAY)}d`;
  return `${Math.floor(ms / WEEK)}w`;
}
