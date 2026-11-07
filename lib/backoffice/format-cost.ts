/**
 * Model costs, which the ledger keeps as integer millionths of a currency
 * unit. A call often costs a fraction of a cent, so small amounts keep enough
 * digits not to read as zero.
 */

function fractionDigits(amount: number): number {
  const size = Math.abs(amount);
  if (size === 0 || size >= 1) return 2;
  return size >= 0.0001 ? 4 : 6;
}

/** `micros` as money in `currency`, or as a bare amount when the currency is unknown or empty. */
export function formatMicros(micros: number, currency: string, locale: string): string {
  const amount = micros / 1_000_000;
  const digits = fractionDigits(amount);
  const number = { minimumFractionDigits: digits, maximumFractionDigits: digits };
  if (currency) {
    try {
      return new Intl.NumberFormat(locale, { ...number, style: 'currency', currency }).format(
        amount
      );
    } catch {
      // Not an ISO 4217 code: fall through and name it after the amount.
    }
  }
  const bare = new Intl.NumberFormat(locale, number).format(amount);
  return currency ? `${bare} ${currency}` : bare;
}

/** A call's duration: milliseconds below a second, seconds to one decimal above. */
export function formatDuration(ms: number, locale: string): string {
  if (ms < 1000) return `${new Intl.NumberFormat(locale).format(ms)} ms`;
  const seconds = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(ms / 1000);
  return `${seconds} s`;
}

/**
 * A ledger row's cost. A call that billed nothing and named no currency (one
 * refused, failed before a provider answered, or still running) shows a dash:
 * "0.00" would claim a bill that was never issued.
 */
export function formatCost(
  job: { cost_micros: number; cost_currency: string },
  locale: string
): string {
  if (job.cost_micros === 0 && !job.cost_currency) return '—';
  return formatMicros(job.cost_micros, job.cost_currency, locale);
}
