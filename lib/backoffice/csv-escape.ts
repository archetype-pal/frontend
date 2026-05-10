/**
 * Escape a single CSV field, neutralizing both structural breakage AND
 * Excel/Sheets/Numbers formula injection (OWASP CSV_Injection).
 *
 * Used by the search-results CSV export and the backoffice data-table
 * export. Fields like `description`, `name`, `place`, `shelfmark` carry
 * user input from upstream records, so a malicious row could exfiltrate
 * data on open without this guard.
 */

// Excel/Sheets/Numbers interpret a leading `=`, `+`, `-`, `@`, tab, or `\r`
// as a formula. Prefix with a single quote to neutralize while keeping the
// visible cell readable. https://owasp.org/www-community/attacks/CSV_Injection
const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r]/;

export function escapeCsvField(value: string): string {
  const safe = FORMULA_PREFIX_PATTERN.test(value) ? `'${value}` : value;
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n') || safe.includes('\r')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}
