/** The message of a thrown `Error`; `fallback` (default: the value as a string) for anything else thrown. */
export function errorMessage(error: unknown, fallback?: string): string {
  return error instanceof Error ? error.message : (fallback ?? String(error));
}
