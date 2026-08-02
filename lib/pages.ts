export type PageLocale = 'en' | 'fr';

export type LocalizedText = {
  en: string;
  fr: string;
};

export type PageStatus = 'Draft' | 'Published';

export type Page = {
  id: number;
  slug: string;
  title: LocalizedText;
  content: LocalizedText;
  status: PageStatus;
  order: number;
  include_in_quick_link: boolean;
  created_at: string;
  updated_at: string;
};

export type PageListItem = Pick<
  Page,
  'id' | 'slug' | 'title' | 'status' | 'order' | 'include_in_quick_link' | 'updated_at'
>;

// Slugs a DB-backed Page must not shadow (frontend route segments like
// `/about/_components` and `/backoffice/pages/new`, plus any backend-reserved slugs).
export const RESERVED_PAGE_SLUGS = ['_components', 'new'] as const;

export function isReservedPageSlug(slug: string): boolean {
  return (RESERVED_PAGE_SLUGS as readonly string[]).includes(slug);
}

export function resolvePageText(text: LocalizedText, locale: PageLocale): string {
  return text[locale] || text.en;
}

function normalizeLocalizedText(value: unknown): LocalizedText {
  if (!value || typeof value !== 'object') return { en: '', fr: '' };
  const partial = value as Partial<Record<PageLocale, unknown>>;
  return {
    en: typeof partial.en === 'string' ? partial.en : '',
    fr: typeof partial.fr === 'string' ? partial.fr : '',
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
    order: typeof obj.order === 'number' ? obj.order : 0,
    include_in_quick_link: obj.include_in_quick_link === true,
    updated_at: typeof obj.updated_at === 'string' ? obj.updated_at : '',
  };
}
