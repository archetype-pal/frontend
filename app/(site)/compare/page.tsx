'use client';

import * as React from 'react';
import Link from 'next/link';
import { GitCompare, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { MiradorViewer } from '@/components/compare/mirador-viewer';
import { getManifestUrl } from '@/lib/iiif-manifest';
import { useCompareStore } from '@/stores/compare-store';

export default function ComparePage() {
  const t = useTranslations('compare.page');
  const items = useCompareStore((state) => state.items);
  const removeItem = useCompareStore((state) => state.removeItem);
  const clear = useCompareStore((state) => state.clear);
  const manifestUrls = React.useMemo(() => items.map((item) => getManifestUrl(item.itemPartId)), [items]);

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 sm:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-linear-to-br from-gray-50 to-gray-100 mb-6 shadow-sm">
            <GitCompare className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed max-w-md mx-auto">
            {t('emptyTitle')}
            {' — '}
            {t('emptyDescription')}
          </p>
          <Link href="/search/manuscripts">
            <Button size="lg">{t('browseManuscripts')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="sr-only">{t('title')}</h1>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap items-center gap-2">
          {items.map((item) => (
            <li
              key={item.itemPartId}
              className="flex items-center gap-1.5 rounded-full border bg-card py-1 pl-3 pr-1.5 text-sm"
            >
              <Link
                href={`/manuscripts/${item.itemPartId}`}
                className="max-w-xs truncate hover:text-primary hover:underline"
              >
                {item.shelfmark || item.displayLabel}
              </Link>
              <button
                type="button"
                onClick={() => removeItem(item.itemPartId)}
                aria-label={t('removeItem', { label: item.displayLabel })}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <Button variant="outline" size="sm" onClick={clear} className="shrink-0">
          {t('clearButton')}
        </Button>
      </div>

      <MiradorViewer manifestUrls={manifestUrls} className="h-[75vh] w-full rounded-lg border" />
    </div>
  );
}
