'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Book, FileText, ImageIcon, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface ManuscriptTabsProps {
  manuscriptId: string;
  imageId: string;
  counts?: {
    annotations?: number;
    texts?: number;
    otherImages?: number;
  };
}

export function ManuscriptTabs({ manuscriptId, imageId, counts }: ManuscriptTabsProps) {
  const t = useTranslations('manuscript');
  const pathname = usePathname();
  const base = `/manuscripts/${manuscriptId}/images/${imageId}`;

  const tabs = [
    { segment: '', label: t('tabs.selectedImage'), icon: ImageIcon, countKey: undefined },
    { segment: 'annotations', label: t('tabs.annotations'), icon: FileText, countKey: 'annotations' as const },
    { segment: 'texts', label: t('tabs.texts'), icon: Book, countKey: 'texts' as const },
    { segment: 'other-images', label: t('tabs.otherImages'), icon: ImageIcon, countKey: 'otherImages' as const },
    { segment: 'copyright', label: t('tabs.imageCopyright'), icon: Info, countKey: undefined },
  ];

  return (
    <nav
      className="-mb-px flex items-center gap-1 overflow-x-auto whitespace-nowrap"
      aria-label={t('tabs.ariaLabel')}
    >
      {tabs.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const isActive = tab.segment
          ? pathname === href || pathname.startsWith(`${href}/`)
          : pathname === base;
        const Icon = tab.icon;
        const count = tab.countKey ? counts?.[tab.countKey] : undefined;

        return (
          <Link
            key={tab.segment || 'root'}
            href={href}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              className={cn('h-4 w-4', isActive ? 'text-accent' : 'text-muted-foreground/70')}
            />
            <span>
              {tab.label}
              {typeof count === 'number' && (
                <span className="ml-1 tabular-nums text-muted-foreground">{count}</span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
