export type PageLocale = 'en' | 'fr' | 'de';

export type LocalizedText = {
  en: string;
  fr: string;
  de: string;
};

export type PageStatus = 'Draft' | 'Published';

export type Page = {
  id: number;
  slug: string;
  title: LocalizedText;
  content: LocalizedText;
  status: PageStatus;
  /** Slug of the custom menu heading the page is listed under; null = About. */
  menu_heading: string | null;
  order: number;
  include_in_quick_link: boolean;
  created_at: string;
  updated_at: string;
};

export type PageListItem = Pick<
  Page,
  | 'id'
  | 'slug'
  | 'title'
  | 'status'
  | 'menu_heading'
  | 'order'
  | 'include_in_quick_link'
  | 'updated_at'
>;

/** An admin-created main-menu heading that groups Pages (the backend `MenuHeading`). */
export type MenuHeading = {
  id: number;
  slug: string;
  title: LocalizedText;
};

/**
 * Every page lives at `/about/{slug}`, whatever its menu heading, so moving a
 * page to another heading never breaks a link to it (frontend#146).
 */
export function pageHref(slug: string): string {
  return `/about/${slug}`;
}

// Slugs a DB-backed Page must not shadow (frontend route segments like
// `/about/_components` and `/backoffice/pages/new`, plus any backend-reserved slugs).
export const RESERVED_PAGE_SLUGS = ['_components', 'new'] as const;

// Mirrors RESERVED_HEADING_SLUGS in the backend's apps/pages/models.py: "about"
// is the built-in heading's key in the nav order.
export const RESERVED_HEADING_SLUGS = ['about', 'new'] as const;

export function isReservedHeadingSlug(slug: string): boolean {
  return (RESERVED_HEADING_SLUGS as readonly string[]).includes(slug);
}

export function isReservedPageSlug(slug: string): boolean {
  return (RESERVED_PAGE_SLUGS as readonly string[]).includes(slug);
}

export function resolvePageText(text: LocalizedText, locale: PageLocale): string {
  return text[locale] || text.en;
}

function normalizeLocalizedText(value: unknown): LocalizedText {
  if (!value || typeof value !== 'object') return { en: '', fr: '', de: '' };
  const partial = value as Partial<Record<PageLocale, unknown>>;
  return {
    en: typeof partial.en === 'string' ? partial.en : '',
    fr: typeof partial.fr === 'string' ? partial.fr : '',
    de: typeof partial.de === 'string' ? partial.de : '',
  };
}

export function normalizePage(raw: unknown): Page | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.slug !== 'string') return null;

  return {
    id: typeof obj.id === 'number' ? obj.id : 0,
    slug: obj.slug,
    title: normalizeLocalizedText(obj.title),
    content: normalizeLocalizedText(obj.content),
    status: obj.status === 'Published' ? 'Published' : 'Draft',
    menu_heading: typeof obj.menu_heading === 'string' ? obj.menu_heading : null,
    order: typeof obj.order === 'number' ? obj.order : 0,
    include_in_quick_link: obj.include_in_quick_link === true,
    created_at: typeof obj.created_at === 'string' ? obj.created_at : '',
    updated_at: typeof obj.updated_at === 'string' ? obj.updated_at : '',
  };
}

export function normalizePageListItem(raw: unknown): PageListItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.slug !== 'string') return null;

  return {
    id: typeof obj.id === 'number' ? obj.id : 0,
    slug: obj.slug,
    title: normalizeLocalizedText(obj.title),
    status: obj.status === 'Published' ? 'Published' : 'Draft',
    menu_heading: typeof obj.menu_heading === 'string' ? obj.menu_heading : null,
    order: typeof obj.order === 'number' ? obj.order : 0,
    include_in_quick_link: obj.include_in_quick_link === true,
    updated_at: typeof obj.updated_at === 'string' ? obj.updated_at : '',
  };
}

export function normalizeMenuHeading(raw: unknown): MenuHeading | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.slug !== 'string') return null;

  return {
    id: typeof obj.id === 'number' ? obj.id : 0,
    slug: obj.slug,
    title: normalizeLocalizedText(obj.title),
  };
}
