'use client';

import { useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useStoredPreference } from '@/hooks/use-stored-preference';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import {
  LayoutDashboard,
  BookOpen,
  Landmark,
  Newspaper,
  PenTool,
  Feather,
  Type,
  FileText,
  Files,
  ScrollText,
  MessageSquare,
  Image,
  Handshake,
  Users,
  UserCog,
  Hand,
  Search,
  Archive,
  Database,
  Hash,
  MapPin,
  Library,
  Settings,
  Languages,
  ToggleLeft,
  Trash2,
  HeartPulse,
  Sparkles,
  ScanText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getComments } from '@/services/backoffice/publications';
import { getAnnotationProposalDepth } from '@/services/backoffice/annotation-proposals';
import { getDiplomaticProposalDepth } from '@/services/backoffice/diplomatic-proposals';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { useTranslations } from 'next-intl';
import { useModelLabels } from '@/contexts/model-labels-context';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSubGroup {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  subGroups?: NavSubGroup[];
}

interface BackofficeSidebarProps {
  collapsed: boolean;
}

export function BackofficeSidebar({ collapsed }: BackofficeSidebarProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { getLabel, getPluralLabel } = useModelLabels();
  const t = useTranslations('backoffice');
  const navigation = useMemo<NavGroup[]>(() => {
    const groups: NavGroup[] = [
      {
        label: t('sidebar.groupManuscripts'),
        icon: BookOpen,
        items: [
          { label: getLabel('appManuscripts'), href: '/backoffice/manuscripts', icon: BookOpen },
          { label: t('sidebar.scribes'), href: '/backoffice/scribes', icon: Users },
          { label: t('sidebar.hands'), href: '/backoffice/hands', icon: Hand },
          { label: t('sidebar.annotations'), href: '/backoffice/annotations', icon: PenTool },
          {
            label: t('sidebar.annotationProposals'),
            href: '/backoffice/annotation-proposals',
            icon: Sparkles,
          },
          { label: t('sidebar.texts'), href: '/backoffice/texts', icon: ScrollText },
          {
            label: t('sidebar.diplomaticProposals'),
            href: '/backoffice/diplomatic-proposals',
            icon: ScanText,
          },
          { label: t('sidebar.characters'), href: '/backoffice/symbols', icon: Type },
        ],
        subGroups: [
          {
            label: t('sidebar.supportingData'),
            defaultOpen: true,
            items: [
              {
                label: t('sidebar.physicalVolumes'),
                href: '/backoffice/physical-volumes',
                icon: Archive,
              },
              {
                label: t('sidebar.repositories'),
                href: '/backoffice/repositories',
                icon: Landmark,
              },
              { label: getPluralLabel('date'), href: '/backoffice/dates', icon: Hash },
              { label: t('sidebar.places'), href: '/backoffice/places', icon: MapPin },
              { label: t('sidebar.scripts'), href: '/backoffice/scripts', icon: Feather },
              { label: t('sidebar.formats'), href: '/backoffice/formats', icon: Library },
              { label: t('sidebar.sources'), href: '/backoffice/sources', icon: Database },
            ],
          },
        ],
      },
      {
        label: t('sidebar.groupSiteContent'),
        icon: Newspaper,
        items: [
          { label: t('sidebar.publications'), href: '/backoffice/publications', icon: FileText },
          { label: t('sidebar.comments'), href: '/backoffice/comments', icon: MessageSquare },
          { label: t('sidebar.carousel'), href: '/backoffice/carousel', icon: Image },
          { label: t('sidebar.pages'), href: '/backoffice/pages', icon: Files },
          { label: t('sidebar.partners'), href: '/backoffice/partners', icon: Handshake },
        ],
      },
    ];
    // The shell admits only users who may manage, so the admin group is always theirs.
    groups.push({
      label: t('sidebar.groupAdmin'),
      icon: Settings,
      items: [
        { label: t('sidebar.userManagement'), href: '/backoffice/users', icon: UserCog },
        { label: t('sidebar.searchEngine'), href: '/backoffice/search-engine', icon: Search },
        { label: t('sidebar.dataQuality'), href: '/backoffice/quality', icon: Settings },
        { label: t('sidebar.translations'), href: '/backoffice/translations', icon: Languages },
        { label: t('sidebar.siteFeatures'), href: '/backoffice/site-features', icon: ToggleLeft },
        { label: t('sidebar.trash'), href: '/backoffice/trash', icon: Trash2 },
        { label: t('sidebar.sanityChecks'), href: '/backoffice/sanity-checks', icon: HeartPulse },
      ],
    });
    return groups;
  }, [getLabel, getPluralLabel, t]);

  // Lightweight poll for pending comments (60s)
  const { data: pendingComments } = useQuery({
    queryKey: backofficeKeys.comments.list({ is_approved: false }),
    queryFn: () => getComments({ is_approved: false }),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Proposals awaiting a reviewer. No retry: a backend without the AI
  // programme's routes answers 404, which should cost one request a minute.
  const { data: proposalDepth } = useQuery({
    queryKey: backofficeKeys.annotationProposals.depth(),
    queryFn: getAnnotationProposalDepth,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });
  const { data: diplomaticDepth } = useQuery({
    queryKey: backofficeKeys.diplomaticProposals.depth(),
    queryFn: getDiplomaticProposalDepth,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });

  const pendingCount = pendingComments?.count ?? 0;
  const badges: Record<string, number> = {
    '/backoffice/comments': pendingCount,
    '/backoffice/annotation-proposals': proposalDepth?.pending ?? 0,
    '/backoffice/diplomatic-proposals': diplomaticDepth?.pending ?? 0,
  };

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-64'
      )}
    >
      {/* Brand */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/backoffice" className="flex items-center gap-2 font-semibold text-base">
          <LayoutDashboard className="h-5 w-5 shrink-0 text-primary" />
          {!collapsed && <span>{t('sidebar.brand')}</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navigation.map((group, idx) => (
          <NavGroupSection
            key={group.label}
            group={group}
            pathname={pathname}
            collapsed={collapsed}
            badges={badges}
            isFirst={idx === 0}
          />
        ))}
      </nav>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Collapsible sub-group (localStorage-persisted)
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'backoffice-subgroup-';
const serializeOpen = (open: boolean) => (open ? '1' : '0');

function useSubGroupOpen(label: string, defaultOpen: boolean) {
  const key = STORAGE_PREFIX + label.toLowerCase().replace(/\s+/g, '-');

  const [open, setOpen] = useStoredPreference(
    key,
    (raw) => (raw !== null ? raw === '1' : defaultOpen),
    serializeOpen,
    defaultOpen
  );
  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  return { open, toggle };
}

function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

/** An expanded sidebar entry: icon, label, and a count badge while it is above zero. */
function NavItemLink({
  item,
  pathname,
  badges,
}: {
  item: NavItem;
  pathname: string;
  badges: Record<string, number>;
}) {
  const ItemIcon = item.icon;
  const badgeCount = badges[item.href] ?? 0;
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
        isActiveHref(pathname, item.href)
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <ItemIcon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {badgeCount > 0 ? (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium text-destructive-foreground">
          {badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

function CollapsibleSubGroup({
  subGroup,
  pathname,
  badges,
}: {
  subGroup: NavSubGroup;
  pathname: string;
  badges: Record<string, number>;
}) {
  const t = useTranslations('backoffice');
  const { open, toggle } = useSubGroupOpen(subGroup.label, subGroup.defaultOpen ?? true);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={
          open
            ? t('sidebar.subGroupCollapse', { label: subGroup.label })
            : t('sidebar.subGroupExpand', { label: subGroup.label })
        }
        className="flex w-full items-center gap-1.5 px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <span>{subGroup.label}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-0.5">
          {subGroup.items.map((item) => (
            <NavItemLink key={item.href} item={item} pathname={pathname} badges={badges} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nav group section
// ---------------------------------------------------------------------------

function NavGroupSection({
  group,
  pathname,
  collapsed,
  badges = {},
  isFirst = false,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  badges?: Record<string, number>;
  isFirst?: boolean;
}) {
  const Icon = group.icon;

  // Gather all items (including sub-group items) for collapsed mode
  const allItems = [...group.items, ...(group.subGroups?.flatMap((sg) => sg.items) ?? [])];

  if (collapsed) {
    return (
      <div className={cn('px-2', !isFirst && 'mt-2 border-t pt-2')}>
        {allItems.map((item) => {
          const ItemIcon = item.icon;
          const active = isActiveHref(pathname, item.href);
          return (
            <div key={item.href} className="py-0.5">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-md mx-auto',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <ItemIcon className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('px-2', !isFirst && 'mt-3')}>
      {/* Static section header */}
      <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{group.label}</span>
      </div>

      {/* Primary items */}
      <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l pl-2">
        {group.items.map((item) => (
          <NavItemLink key={item.href} item={item} pathname={pathname} badges={badges} />
        ))}

        {/* Collapsible sub-groups */}
        {group.subGroups?.map((sg) => (
          <CollapsibleSubGroup key={sg.label} subGroup={sg} pathname={pathname} badges={badges} />
        ))}
      </div>
    </div>
  );
}
