/**
 * A fresh client-side id. `crypto.randomUUID` only exists in secure contexts
 * (HTTPS and localhost), so a plain-HTTP origin falls back to a random string
 * instead of throwing out of a click or drop handler.
 */
export function newId(prefix?: string): string {
  const body =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return prefix ? `${prefix}-${body}` : body;
}
