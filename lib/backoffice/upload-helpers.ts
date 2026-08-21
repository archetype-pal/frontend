/**
 * Pure helpers for the manuscript-image upload flow. Kept free of React and
 * network code so they can be unit-tested in isolation (upload-helpers.test.ts).
 */

/**
 * Extensions the manuscript upload pipeline accepts. Validation is by
 * extension, not MIME type: browsers report no `File.type` for `.jp2` and
 * only `image/tiff` for `.tif`, so MIME sniffing would reject exactly the
 * archival formats this feature exists to ingest. The backend normalizes
 * everything to lossless JP2 regardless.
 */
export const ACCEPTED_UPLOAD_EXTENSIONS = [
  '.tif',
  '.tiff',
  '.jpg',
  '.jpeg',
  '.png',
  '.jp2',
] as const;

export function isAcceptedImageFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ACCEPTED_UPLOAD_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Guess a folio locus from a scan filename so the editor rarely has to type
 * it. Matches the last folio-like token (digits + r/v, optionally prefixed by
 * `f`/`fol`) and normalizes to `f.<n><side>` with leading zeros stripped.
 * Returns '' when nothing folio-shaped is present — a suggestion, never a
 * guarantee, so the caller keeps it editable.
 *
 *   f12r.tif       → f.12r
 *   0032v.jp2      → f.32v
 *   MS_Add_1234_f005r.tiff → f.5r
 *   scan_0001.jpg  → ''  (no r/v side, ambiguous)
 */
export function guessLocusFromFilename(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, '');
  const matches = [...stem.matchAll(/(\d{1,4})\s*([rv])\b/gi)];
  if (matches.length === 0) return '';
  const last = matches[matches.length - 1];
  const number = String(parseInt(last[1], 10));
  const side = last[2].toLowerCase();
  return `f.${number}${side}`;
}

export interface ChunkPlanEntry {
  index: number;
  start: number;
  end: number;
  size: number;
}

/**
 * Split a file of `fileSize` bytes into sequential chunks of at most
 * `chunkSize`. The last chunk carries the remainder. `chunkSize` comes from
 * the server-created session, so this only mirrors the server's own maths for
 * client-side slicing and progress accounting.
 */
export function planChunks(fileSize: number, chunkSize: number): ChunkPlanEntry[] {
  if (fileSize <= 0) throw new Error('File size must be positive.');
  if (chunkSize <= 0) throw new Error('Chunk size must be positive.');
  const plan: ChunkPlanEntry[] = [];
  for (let index = 0, start = 0; start < fileSize; index++, start += chunkSize) {
    const end = Math.min(start + chunkSize, fileSize);
    plan.push({ index, start, end, size: end - start });
  }
  return plan;
}

/** Human-readable byte size for progress UI (e.g. 1536 → "1.5 KB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 100 || Number.isInteger(value) ? 0 : 1)} ${units[unit]}`;
}
