/** A plain object (not null, not an array): the shape JSON.parse hands back for `{}`. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
