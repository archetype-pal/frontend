'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSiteFeatures } from '@/contexts/site-features-context';
import { searchHref } from '@/lib/search-routing';

export default function NotFound() {
  const t = useTranslations('errors');
  const tCommon = useTranslations('common');
  const { enabledCategories, isSectionEnabled } = useSiteFeatures();
  const defaultSearchType = enabledCategories[0] ?? null;
  const defaultSearchHref = defaultSearchType ? searchHref(defaultSearchType) : null;
  const searchAvailable = isSectionEnabled('search') && defaultSearchHref !== null;

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-xl font-semibold mb-2">{t('notFoundTitle')}</h2>
        <p className="text-muted-foreground mb-8">{t('notFoundBody')}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              {t('backToHome')}
            </Link>
          </Button>
          {searchAvailable && defaultSearchHref && (
            <Button asChild variant="outline">
              <Link href={defaultSearchHref}>
                <Search className="h-4 w-4 mr-2" />
                {tCommon('search')}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
