/** The URL slug the backoffice derives from a title: lower-case ASCII words joined by hyphens. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
