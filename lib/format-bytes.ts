/**
 * Human-readable byte sizes for admin/ops surfaces (e.g. the sanity-checks
 * dashboard's database and media directory sizes).
 *
 * Uses base-1024 units labeled with the familiar KB/MB/GB shorthand (rather
 * than the pedantically-correct KiB/MiB), matching how most ops tooling
 * reports storage sizes.
 */
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

/**
 * Formats a byte count as e.g. "1.5 MB". Returns an em dash for
 * null/undefined/negative/NaN input — the backend reports `null` for
 * signals it can't compute (e.g. database size on a non-Postgres backend).
 */
export function formatBytes(bytes: number | null | undefined, decimals = 1): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes) || bytes < 0) {
    return '—';
  }
  if (bytes === 0) return '0 B';

  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  const formatted = exponent === 0 ? String(value) : value.toFixed(decimals);
  return `${formatted} ${UNITS[exponent]}`;
}
