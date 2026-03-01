'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useSearchContext } from '@/contexts/search-context';
import {
  KeywordSearchInput,
  useKeywordSuggestions,
} from '@/components/search/keyword-search-input';
import {
  Search,
  Home,
  Menu,
  X,
  ChevronDown,
  FolderOpen,
  PanelTopClose,
  PanelTopOpen,
  LogIn,
  Shield,
  LogOut,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCollection } from '@/contexts/collection-context';
import { useAuth } from '@/contexts/auth-context';
import { useSiteFeatures } from '@/contexts/site-features-context';

const BANNER_VISIBLE_KEY = 'moa-header-banner-visible';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { items } = useCollection();
  const { token, user, logout } = useAuth();
  const { isSectionEnabled } = useSiteFeatures();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

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
  const { keyword, setKeyword, suggestionsPool, loadGlobalSuggestions } = useSearchContext();
  const isOnSearchPage = pathname?.startsWith('/search') ?? false;
  const headerSearchValue = isOnSearchPage ? '' : keyword;
  const suggestions = useKeywordSuggestions(headerSearchValue, suggestionsPool);

  const handleTriggerSearch = (kw: string) => {
    setKeyword(kw);
    if (!isOnSearchPage) {
      const query = kw.trim() ? `?keyword=${encodeURIComponent(kw.trim())}` : '';
      router.push(`/search/manuscripts${query}`);
    }
  };

  const handleHeaderSearchChange = (value: string) => {
    if (!isOnSearchPage) setKeyword(value);
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

  return (
    <header className="bg-gray-100 border-b border-gray-200">
      {isBannerVisible && (
        <div className="container mx-auto py-2">
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col md:flex-row items-start md:items-end">
              <h1 className="text-4xl md:text-4xl font-serif text-primary leading-tight mb-2 md:mb-0 md:mr-6">
                Models of Authority
              </h1>
              <div className="text-lg md:text-base text-[#555] border-l-2 border-primary font-sans max-w-md pl-4">
                <p>Scottish Charters</p>
                <p>and the Emergence of Government 1100-1250</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <nav className="bg-primary text-primary-foreground p-2">
        <div className="container mx-auto">
          <div className="flex items-center justify-between md:hidden mb-2">
            <span className="text-sm font-medium">Menu</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
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
                  className={`transition-colors w-full md:w-auto justify-start group ${
                    isActive('/', true)
                      ? 'bg-primary-foreground/30 text-white'
                      : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                  }`}
                >
                  <Link href="/">
                    <Home className="h-4 w-4 mr-1 group-hover:scale-110 transition-transform" />
                    Home
                  </Link>
                </Button>
              </li>
              {isSectionEnabled('search') && (
                <li>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className={`transition-colors w-full md:w-auto justify-start group ${
                      isActive('/search')
                        ? 'bg-primary-foreground/30 text-white'
                        : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                    }`}
                  >
                    <Link href="/search/manuscripts/">
                      <Search className="h-4 w-4 mr-1 group-hover:scale-110 transition-transform" />
                      Search
                    </Link>
                  </Button>
                </li>
              )}
              {isSectionEnabled('collection') && (
                <li>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className={`transition-colors w-full md:w-auto justify-start group ${
                      isActive('/collection', true)
                        ? 'bg-primary-foreground/30 text-white'
                        : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                    }`}
                  >
                    <Link href="/collection">
                      <FolderOpen className="h-4 w-4 mr-1 group-hover:scale-110 transition-transform" />
                      My Collection ({items.length})
                    </Link>
                  </Button>
                </li>
              )}
              {isSectionEnabled('lightbox') && (
                <li>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className={`transition-colors w-full md:w-auto justify-start group ${
                      isActive('/lightbox', true)
                        ? 'bg-primary-foreground/30 text-white'
                        : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                    }`}
                  >
                    <Link href="/lightbox">Lightbox</Link>
                  </Button>
                </li>
              )}
              {isSectionEnabled('news') && (
                <li>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className={`transition-colors w-full md:w-auto justify-start ${
                      isActive('/news')
                        ? 'bg-primary-foreground/30 text-white'
                        : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                    }`}
                  >
                    <Link href="/news/">News</Link>
                  </Button>
                </li>
              )}
              {isSectionEnabled('blogs') && (
                <li>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className={`transition-colors w-full md:w-auto justify-start ${
                      isActive('/blogs')
                        ? 'bg-primary-foreground/30 text-white'
                        : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                    }`}
                  >
                    <Link href="/blogs/">Blogs</Link>
                  </Button>
                </li>
              )}
              {isSectionEnabled('featureArticles') && (
                <li>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className={`transition-colors w-full md:w-auto justify-start ${
                      isActive('/feature')
                        ? 'bg-primary-foreground/30 text-white'
                        : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                    }`}
                  >
                    <Link href="/feature/">Feature Articles</Link>
                  </Button>
                </li>
              )}
              {isSectionEnabled('events') && (
                <li>
                  {mounted ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`transition-colors w-full md:w-auto justify-start group ${
                            isActive('/events')
                              ? 'bg-primary-foreground/30 text-white'
                              : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                          }`}
                        >
                          Past Events
                          <ChevronDown className="ml-1 h-4 w-4 group-hover:scale-110 transition-transform" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <Link href="/events/exhibition/">Exhibition</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Link href="/events/exhibition-launch/">Exhibition Launch</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Link href="/events/colloquium/">Colloquium</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Link href="/events/conference/">Public conference</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`transition-colors w-full md:w-auto justify-start group ${
                        isActive('/events')
                          ? 'bg-primary-foreground/30 text-white'
                          : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                      }`}
                    >
                      Past Events
                      <ChevronDown className="ml-1 h-4 w-4 group-hover:scale-110 transition-transform" />
                    </Button>
                  )}
                </li>
              )}
              {isSectionEnabled('about') && (
                <li>
                  {mounted ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className={`transition-colors group ${
                            isActive('/about')
                              ? 'bg-primary-foreground/30 text-white'
                              : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                          }`}
                        >
                          About{' '}
                          <ChevronDown className="ml-1 h-4 w-4 group-hover:scale-110 transition-transform" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        <DropdownMenuItem>
                          <Link href="/about/historical-context">Historical Context</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Link href="/about/project-team">Project Team</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Link href="/about/citing-database">
                            Citing the Models of Authority database
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Link href="/about/talks-publications">Talks and Publications</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Link href="/about/acknowledgements">
                            Acknowledgements and Image Rights
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Link href="/about/privacy-policy">Privacy and Cookie Policy</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Link href="/about/accessibility">Accessibility Statement</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Link href="/about">About</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button
                      variant="ghost"
                      className={`transition-colors group ${
                        isActive('/about')
                          ? 'bg-primary-foreground/30 text-white'
                          : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                      }`}
                    >
                      About{' '}
                      <ChevronDown className="ml-1 h-4 w-4 group-hover:scale-110 transition-transform" />
                    </Button>
                  )}
                </li>
              )}
            </ul>
            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto md:max-w-xs">
              {isSectionEnabled('search') && (
                <div className="relative flex-1 w-full md:w-auto">
                  <KeywordSearchInput
                    value={headerSearchValue}
                    onChange={handleHeaderSearchChange}
                    onTriggerSearch={handleTriggerSearch}
                    suggestions={suggestions}
                    placeholder="Enter search terms"
                    className="w-full"
                    inputClassName="bg-background text-foreground w-full"
                    clearOnFocus
                    onFocus={handleHeaderSearchFocus}
                  />
                </div>
              )}
              <div className="flex items-center gap-1 shrink-0">
                {token ? (
                  <>
                    {user?.is_staff && (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-primary-foreground hover:bg-primary-foreground/20 hover:text-white"
                      >
                        <Link href="/backoffice">
                          <Shield className="h-4 w-4 mr-1" />
                          Backoffice
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                      onClick={logout}
                      title="Sign out"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-primary-foreground hover:bg-primary-foreground/20 hover:text-white"
                  >
                    <Link href="/login">
                      <LogIn className="h-4 w-4 mr-1" />
                      Sign in
                    </Link>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                  onClick={toggleBanner}
                  aria-label={isBannerVisible ? 'Hide banner' : 'Show banner'}
                  title={isBannerVisible ? 'Hide banner' : 'Show banner'}
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
