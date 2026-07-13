import { create } from 'zustand';
import { type Locale, defaultLocale, locales, LOCALE_COOKIE } from '@/lib/locale';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

function readInitialLocale(): Locale {
  if (typeof document === 'undefined') return defaultLocale;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : undefined;
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: readInitialLocale(),
  setLocale: (locale) => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    set({ locale });
    window.location.reload();
  },
}));
