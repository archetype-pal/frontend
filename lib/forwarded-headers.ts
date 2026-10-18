// Client IP and locale, so Django's throttles and logs see the visitor rather
// than this container, and error messages keep the user's language.
export const CLIENT_REQUEST_HEADERS = ['accept-language', 'x-forwarded-for', 'x-real-ip'] as const;

export function pickHeaders(source: Headers, names: readonly string[]): Headers {
  const picked = new Headers();
  for (const name of names) {
    const value = source.get(name);
    if (value) picked.set(name, value);
  }
  return picked;
}
