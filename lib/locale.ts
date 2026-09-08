export type Locale = 'en' | 'fr' | 'de';

export const defaultLocale: Locale = 'en';
export const locales: Locale[] = ['en', 'fr', 'de'];

export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function coerceLocale(value: string | null | undefined): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}
