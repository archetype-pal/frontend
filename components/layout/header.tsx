'use client';

import { useState, useEffect, useDeferredValue, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useSearchContext } from '@/contexts/search-context';
import {
  KeywordSearchInput,
  useKeywordSuggestions,
  type KeywordSuggestionItem,
} from '@/components/search/keyword-search-input';
import { resolveSuggestionTarget } from '@/lib/search-suggestion-target';
import {
  Compass,
  Home,
  Menu,
  X,
  FolderOpen,
  PanelTopClose,
  PanelTopOpen,
  LogIn,
  Shield,
  LogOut,
} from 'lucide-react';
import { useCollection } from '@/contexts/collection-context';
import { useAuth } from '@/contexts/auth-context';
import { useSiteFeatures } from '@/contexts/site-features-context';
import { normalizeSectionOrder, type SectionKey } from '@/lib/site-features';
import {
  addSearchHistory,
  clearSearchHistory,
  getSearchHistory,
  type SearchHistoryEntry,
} from '@/lib/search-history';
import { resolveResultTypeLabel } from '@/lib/search-label-helpers';
import { useModelLabels } from '@/contexts/model-labels-context';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { useTranslations } from 'next-intl';

const BANNER_VISIBLE_KEY = 'moa-header-banner-visible';

export default function Header() {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const headerRef = useRef<HTMLElement>(null);

  // Publish the sticky header's height as a CSS variable so other sticky chrome
  // (e.g. the search filter rail and table header) can offset below it. The
  // height is dynamic because the title banner can be collapsed.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const setVar = () =>
      document.documentElement.style.setProperty('--site-header-h', `${el.offsetHeight}px`);
    setVar();
    const observer = new ResizeObserver(setVar);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const { items, activeCollection } = useCollection();
  const { getLabel } = useModelLabels();
  const { token, user, logout } = useAuth();
  const { config, isSectionEnabled } = useSiteFeatures();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem(BANNER_VISIBLE_KEY);
    if (stored !== null) {
      const value = stored === 'true';
      queueMicrotask(() => setIsBannerVisible(value));
    }
  }, []);

  const toggleBanner = () => {
    const next = !isBannerVisible;
    setIsBannerVisible(next);
    localStorage.setItem(BANNER_VISIBLE_KEY, String(next));
  };
  const router = useRouter();
  const { suggestionsPool, loadGlobalSuggestions, getServerSuggestions } = useSearchContext();
  const isOnSearchPage = pathname?.startsWith('/search') ?? false;
  const [headerKeyword, setHeaderKeyword] = useState('');
  const [historyItems, setHistoryItems] = useState<SearchHistoryEntry[]>(() =>
    typeof window !== 'undefined' ? getSearchHistory() : []
  );
  const headerSearchValue = isOnSearchPage ? '' : headerKeyword;
  const localSuggestions = useKeywordSuggestions(headerSearchValue, suggestionsPool);
  const deferredHeaderKeyword = useDeferredValue(headerSearchValue);
  const serverSuggestionsQuery = useQuery({
    queryKey: ['header-suggestions', deferredHeaderKeyword],
    queryFn: () => getServerSuggestions(deferredHeaderKeyword),
    enabled: deferredHeaderKeyword.trim().length >= 2,
    staleTime: 30_000,
    retry: false,
  });
  const effectiveSuggestions =
    serverSuggestionsQuery.data && serverSuggestionsQuery.data.length > 0
      ? serverSuggestionsQuery.data
      : localSuggestions;

  useEffect(() => {
    if (!isOnSearchPage) {
      void loadGlobalSuggestions();
    }
  }, [isOnSearchPage, loadGlobalSuggestions]);

  const handleTriggerSearch = (kw: string) => {
    setHeaderKeyword(kw);
    const normalized = kw.trim();
    if (normalized) {
      addSearchHistory(normalized, 'manuscripts');
      setHistoryItems(getSearchHistory());
    }
    if (!isOnSearchPage) {
      const query = normalized ? `?keyword=${encodeURIComponent(normalized)}` : '';
      router.push(`/search/manuscripts${query}`);
    }
  };

  // A suggestion that names a specific record opens that record; a typed result
  // without an id-only detail page routes to its results tab; query rows fall
  // through (return false) to the keyword search.
  const navigateToSuggestion = (item: KeywordSuggestionItem): boolean => {
    const target = resolveSuggestionTarget(item);
    if (target.kind === 'search') return false;
    if (target.kind === 'entity') {
      router.push(target.href);
      return true;
    }
    // Scoped: keep the user's typed query (not the suggestion's label) so the
    // term they searched stays highlighted in that tab — e.g. "william" stays
    // marked in the Texts passages rather than being replaced by a shelfmark.
    const keyword = (headerSearchValue || item.value).trim();
    addSearchHistory(keyword, target.resultType);
    setHistoryItems(getSearchHistory());
    const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
    router.push(`/search/${target.resultType}${query}`);
    return true;
  };

  const handleHeaderSearchChange = (value: string) => {
    if (!isOnSearchPage) setHeaderKeyword(value);
  };

  const handleHeaderSearchFocus = () => {
    if (!isOnSearchPage) {
      loadGlobalSuggestions();
    }
  };

  // Helper function to check if a route is active
  const isActive = (href: string, exact: boolean = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  const orderedSections = normalizeSectionOrder(config.sectionOrder);

  const navLinkClass = (active: boolean) =>
    cn(
      'transition-colors w-full md:w-auto justify-start',
      active
        ? 'text-white font-semibold border-b-2 border-accent rounded-none'
        : 'text-primary-foreground/80 hover:text-white hover:bg-primary-foreground/10'
    );

  const renderSectionButton = (sectionKey: SectionKey) => {
    if (!isSectionEnabled(sectionKey)) {
      return null;
    }

    switch (sectionKey) {
      case 'search':
        return (
          <li key={sectionKey}>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn('group', navLinkClass(!!isActive('/search')))}
            >
              <Link href="/search/manuscripts">
                <Compass className="h-4 w-4 mr-1 group-hover:scale-110 transition-transform" />
                Explore
              </Link>
            </Button>
          </li>
        );
      case 'collection':
        return (
          <li key={sectionKey}>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn('group', navLinkClass(!!isActive('/collection', true)))}
            >
              <Link href="/collection">
                <FolderOpen className="h-4 w-4 mr-1 group-hover:scale-110 transition-transform" />
                {t('collection', { name: activeCollection.name, count: items.length })}
              </Link>
            </Button>
          </li>
        );
      case 'lightbox':
        return (
          <li key={sectionKey}>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn('group', navLinkClass(!!isActive('/lightbox', true)))}
            >
              <Link href="/lightbox">{t('lightbox')}</Link>
            </Button>
          </li>
        );
      case 'news':
        return (
          <li key={sectionKey}>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={navLinkClass(!!isActive('/publications/news'))}
            >
              <Link href="/publications/news">{t('news')}</Link>
            </Button>
          </li>
        );
      case 'blogs':
        return (
          <li key={sectionKey}>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={navLinkClass(!!isActive('/publications/blogs'))}
            >
              <Link href="/publications/blogs">{t('blogs')}</Link>
            </Button>
          </li>
        );
      case 'featureArticles':
        return (
          <li key={sectionKey}>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={navLinkClass(!!isActive('/publications/feature'))}
            >
              <Link href="/publications/feature">{t('featureArticles')}</Link>
            </Button>
          </li>
        );
      case 'events':
        return null;
      case 'about':
        return (
          <li key={sectionKey}>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={navLinkClass(!!isActive('/about'))}
            >
              <Link href="/about/about-models-of-authority">{t('about')}</Link>
            </Button>
          </li>
        );
      default:
        return null;
    }
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md"
    >
      {isBannerVisible && (
        <div className="container mx-auto px-4 py-4 md:py-5">
          <div className="flex items-end gap-6">
            <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-primary-foreground leading-tight">
              {getLabel('siteTitle')}
            </h1>
            <p className="hidden md:block text-sm text-primary-foreground/85 max-w-xs pb-0.5">
              {getLabel('siteTagline')}
            </p>
          </div>
        </div>
      )}
      <nav className="border-t border-primary-foreground/15 px-2 py-1.5">
        <div className="container mx-auto">
          <div className="flex items-center justify-between md:hidden mb-2">
            <span className="text-sm font-medium text-primary-foreground">{t('menu')}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? t('closeMenu') : t('openMenu')}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
          <div
            className={`flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-2 ${
              isMenuOpen ? 'flex' : 'hidden md:flex'
            }`}
          >
            <ul className="flex flex-col md:flex-row md:items-center gap-2 md:gap-1 mr-0 md:mr-2">
              <li>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn('group', navLinkClass(!!isActive('/', true)))}
                >
                  <Link href="/">
                    <Home className="h-4 w-4 mr-1 group-hover:scale-110 transition-transform" />
                    {t('home')}
                  </Link>
                </Button>
              </li>
              {orderedSections.map((sectionKey) => renderSectionButton(sectionKey))}
            </ul>
            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
              {isSectionEnabled('search') && (
                <div
                  className={cn(
                    'relative w-full md:w-72 lg:w-80',
                    // On the search page the page itself owns a prominent search
                    // field, so the desktop nav search would be a confusing
                    // second box. Keep it on mobile, where the page header has none.
                    isOnSearchPage && 'md:hidden'
                  )}
                >
                  <KeywordSearchInput
                    value={headerSearchValue}
                    onChange={handleHeaderSearchChange}
                    onTriggerSearch={handleTriggerSearch}
                    onSuggestionNavigate={navigateToSuggestion}
                    suggestions={effectiveSuggestions}
                    placeholder={t('searchPlaceholder')}
                    className="w-full"
                    inputClassName="h-10 w-full rounded-full border border-primary-foreground/25 bg-primary-foreground/15 text-[0.95rem] text-white shadow-none placeholder:text-primary-foreground/60 hover:bg-primary-foreground/20 focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/70"
                    iconClassName="text-primary-foreground/65"
                    clearOnFocus
                    onFocus={handleHeaderSearchFocus}
                    suggestionsLoading={serverSuggestionsQuery.isFetching}
                    noSuggestionsText={t('searchNoSuggestions')}
                    recentSearches={historyItems.map((entry, idx) => ({
                      id: `recent-${idx}-${entry.timestamp}`,
                      label: entry.keyword,
                      value: entry.keyword,
                      meta: resolveResultTypeLabel(entry.resultType, getLabel),
                    }))}
                    onClearRecentSearches={() => {
                      clearSearchHistory();
                      setHistoryItems([]);
                    }}
                  />
                </div>
              )}
              <div className="flex items-center gap-1 shrink-0">
                <LanguageSwitcher />
                {token ? (
                  <>
                    {user?.is_superuser && (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-primary-foreground/80 hover:text-white hover:bg-primary-foreground/10"
                      >
                        <Link href="/backoffice">
                          <Shield className="h-4 w-4 mr-1" />
                          {t('backoffice')}
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary-foreground/80 hover:text-white hover:bg-primary-foreground/10"
                      onClick={logout}
                      title={tCommon('signOut')}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-primary-foreground/80 hover:text-white hover:bg-primary-foreground/10"
                  >
                    <Link href="/login">
                      <LogIn className="h-4 w-4 mr-1" />
                      {tCommon('signIn')}
                    </Link>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground/80 hover:text-white hover:bg-primary-foreground/10"
                  onClick={toggleBanner}
                  aria-label={isBannerVisible ? t('bannerHide') : t('bannerShow')}
                  title={isBannerVisible ? t('bannerHide') : t('bannerShow')}
                >
                  {isBannerVisible ? (
                    <PanelTopClose className="h-4 w-4" />
                  ) : (
                    <PanelTopOpen className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
