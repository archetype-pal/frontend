'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { PanelLeftClose, PanelLeft, LogOut, User, Keyboard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRecentEntities } from '@/hooks/backoffice/use-recent-entities';
import { useModelLabels } from '@/contexts/model-labels-context';

interface BackofficeHeaderProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

function useBreadcrumbs(segmentLabels: Record<string, string>) {
  const pathname = usePathname();
  const { entities: recentEntities } = useRecentEntities();
  const segments = pathname.split('/').filter(Boolean);

  return segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    // `decodeURIComponent` throws URIError on malformed percent-encoding
    // (e.g. a stray `%` from a hand-typed URL). Without the guard, the
    // entire breadcrumb component crashes — and through React's error
    // propagation, the backoffice header along with it. Fall back to the
    // raw segment so the page still renders.
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      decoded = segment;
    }
    let label = segmentLabels[segment] ?? decoded;

    // Try to resolve entity name from recent entities for dynamic segments
    if (!segmentLabels[segment] && index > 1) {
      const entity = recentEntities.find((e) => e.href === href);
      if (entity) {
        label = entity.label;
      } else if (/^\d+$/.test(segment)) {
        // Numeric IDs look better prefixed with #
        label = `#${segment}`;
      }
    }

    const isLast = index === segments.length - 1;
    return { href, label, isLast };
  });
}

export function BackofficeHeader({ collapsed, onToggleSidebar }: BackofficeHeaderProps) {
  const t = useTranslations('backoffice');
  const { user, logout } = useAuth();
  const { getLabel, getPluralLabel } = useModelLabels();
  const segmentLabels: Record<string, string> = React.useMemo(
    () => ({
      backoffice: t('header.breadcrumbs.backoffice'),
      symbols: t('header.breadcrumbs.symbols'),
      manuscripts: getLabel('appManuscripts'),
      repositories: t('header.breadcrumbs.repositories'),
      publications: t('header.breadcrumbs.publications'),
      events: t('header.breadcrumbs.events'),
      comments: t('header.breadcrumbs.comments'),
      carousel: t('header.breadcrumbs.carousel'),
      scribes: t('header.breadcrumbs.scribes'),
      hands: t('header.breadcrumbs.hands'),
      dates: getPluralLabel('date'),
      formats: t('header.breadcrumbs.formats'),
      sources: t('header.breadcrumbs.sources'),
      annotations: t('header.breadcrumbs.annotations'),
      'physical-volumes': t('header.breadcrumbs.physicalVolumes'),
      users: t('header.breadcrumbs.users'),
      'search-engine': t('header.breadcrumbs.searchEngine'),
      translations: t('header.breadcrumbs.translations'),
      'site-features': t('header.breadcrumbs.siteFeatures'),
      new: t('header.breadcrumbs.new'),
    }),
    [getLabel, getPluralLabel, t]
  );
  const crumbs = useBreadcrumbs(segmentLabels);

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-card px-4">
      <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="h-8 w-8 shrink-0">
        {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        <span className="sr-only">{t('header.toggleSidebar')}</span>
      </Button>

      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <React.Fragment key={crumb.href}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage className="max-w-[200px] truncate">{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Keyboard shortcut hints */}
      <div className="hidden sm:flex items-center gap-1.5">
        <kbd className="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          <Keyboard className="h-3 w-3" />
          <span>Ctrl+K</span>
        </kbd>
        <kbd className="inline-flex items-center rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          ?
        </kbd>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-xs">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">
              {user?.first_name || user?.username || t('header.userFallback')}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            {user?.email}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            {t('header.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
