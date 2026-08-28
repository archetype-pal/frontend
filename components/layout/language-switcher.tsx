'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { locales, type Locale } from '@/lib/locale';
import { useLocaleStore } from '@/stores/locale-store';

const LOCALE_LABELS: Record<Locale, { short: string; full: string }> = {
  en: { short: 'EN', full: 'English' },
  fr: { short: 'FR', full: 'Français' },
  de: { short: 'DE', full: 'Deutsch' },
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocaleStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-primary-foreground/80 hover:text-white hover:bg-primary-foreground/10 font-medium text-xs tracking-wider"
          title={LOCALE_LABELS[locale].full}
        >
          {LOCALE_LABELS[locale].short}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((code) => (
          <DropdownMenuItem
            key={code}
            onSelect={() => setLocale(code)}
            className={code === locale ? 'font-semibold' : undefined}
          >
            {LOCALE_LABELS[code].full}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
