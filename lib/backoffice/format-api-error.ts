import { toast } from 'sonner';
import { BackofficeApiError } from '@/services/backoffice/api-client';

/**
 * Extract a human-readable error description from a BackofficeApiError or generic Error.
 *
 * DRF returns field-level errors like:
 *   { "title": ["This field is required."], "slug": ["Already exists."] }
 *
 * Or non-field errors:
 *   { "detail": "Not found." }
 *   { "non_field_errors": ["..."] }
 */
export function formatApiError(error: unknown): string {
  if (error instanceof BackofficeApiError) {
    const { body } = error;

    // Single detail string (e.g. 404)
    if (typeof body.detail === 'string') return body.detail;

    // Non-field errors
    if (Array.isArray(body.non_field_errors)) {
      return (body.non_field_errors as string[]).join('. ');
    }

    // Field-level errors — collect them into a readable string
    const messages: string[] = [];
    for (const [field, value] of Object.entries(body)) {
      if (Array.isArray(value)) {
        messages.push(`${field}: ${(value as string[]).join(', ')}`);
      } else if (typeof value === 'string') {
        messages.push(`${field}: ${value}`);
      }
    }
    if (messages.length > 0) return messages.join('. ');

    return `Server error (${error.status})`;
  }

  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

/** The standard failure toast: `title` headline, the API's own message underneath. */
export function toastApiError(title: string, error: unknown): void {
  toast.error(title, { description: formatApiError(error) });
}
