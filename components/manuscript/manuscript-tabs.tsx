'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Book, FileText, ImageIcon, Info } from 'lucide-react';
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

interface TabDef {
  segment: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  countKey?: 'annotations' | 'texts' | 'otherImages';
}

const TABS: TabDef[] = [
  { segment: '', label: 'Manuscript Image', icon: ImageIcon },
  { segment: 'annotations', label: 'Annotations', icon: FileText, countKey: 'annotations' },
  { segment: 'texts', label: 'Texts', icon: Book, countKey: 'texts' },
  { segment: 'other-images', label: 'Other Images', icon: ImageIcon, countKey: 'otherImages' },
  { segment: 'copyright', label: 'Image Copyright', icon: Info },
];

export function ManuscriptTabs({ manuscriptId, imageId, counts }: ManuscriptTabsProps) {
  const pathname = usePathname();
  const base = `/manuscripts/${manuscriptId}/images/${imageId}`;

  return (
    <nav className="flex items-center gap-1 border-b px-4" aria-label="Image tabs">
      {TABS.map((tab) => {
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
              'inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-4 w-4" />
            <span>
              {tab.label}
              {typeof count === 'number' && ` (${count})`}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
