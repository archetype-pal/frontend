'use client';

import { Button } from '@/components/ui/button';
import { useLocaleStore } from '@/stores/locale-store';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocaleStore();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 text-primary-foreground/80 hover:text-white hover:bg-primary-foreground/10 font-medium text-xs tracking-wider"
      onClick={() => setLocale(locale === 'en' ? 'fr' : 'en')}
      title={locale === 'en' ? 'Passer en français' : 'Switch to English'}
    >
      {locale === 'en' ? 'FR' : 'EN'}
    </Button>
  );
}
