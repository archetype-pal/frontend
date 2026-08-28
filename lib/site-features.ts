import {
  getDefaultVisibleColumns,
  getFacetOrder,
  SEARCH_RESULT_TYPES,
  type ResultType,
} from './search-types';
import { getSiteThemeVars, siteThemeVarToHex } from './site-theme';

export type SectionKey =
  'search' | 'collection' | 'lightbox' | 'news' | 'blogs' | 'featureArticles' | 'events' | 'about';

/**
 * Admin-controlled flags for optional site *features* — as opposed to
 * `SectionKey`, which is a top-level navigation entry (labelled, drag-sortable,
 * routed). A feature flag hides a surface inside pages that keep existing; it
 * never appears in the nav and has no ordering. Add flags to this union (plus
 * `ALL_FEATURE_KEYS` and the two metadata maps below) as more surfaces become
 * optional.
 */
export type FeatureKey = 'manuscriptDescriptions';

export type SearchCategoryConfig = {
  enabled: boolean;
  visibleColumns: string[];
  visibleFacets: string[];
};

/**
 * The brand colours a super admin can repaint from `UI customization`: the
 * main brand colour (buttons, active nav — CSS `--primary` / `--ring`), the
 * colour drawn on top of it (`--primary-foreground`), the secondary/highlight
 * colour (`--accent`, used for badges and call-outs), and the two rows of the
 * site header — the title/tagline row and the navigation row below it — each
 * with its own background and text colour so a deployment can, e.g., run a
 * light title row over a dark nav row (see archetype-pal/frontend#103).
 */
export type ThemeColors = {
  primaryColor: string;
  primaryForegroundColor: string;
  accentColor: string;
  titleBarBackgroundColor: string;
  titleBarTextColor: string;
  navBarBackgroundColor: string;
  navBarTextColor: string;
};

/** The instance logo shown at the top of the header's title row. */
export type BrandingConfig = {
  logoUrl: string;
};

export type SiteFeaturesConfig = {
  sections: Record<SectionKey, boolean>;
  sectionOrder: SectionKey[];
  features: Record<FeatureKey, boolean>;
  searchCategories: Record<ResultType, SearchCategoryConfig>;
  theme: ThemeColors;
  branding: BrandingConfig;
};

/** Order matters: this is the default nav order, and it must match the backend
 *  seed (`0010_seed_site_features.py`) and `config/site-features.json`. */
export const ALL_SECTION_KEYS: SectionKey[] = [
  'search',
  'lightbox',
  'collection',
  'blogs',
  'featureArticles',
  'about',
  'news',
  'events',
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  search: 'Explore',
  collection: 'My Collection',
  lightbox: 'Lightbox',
  news: 'News',
  blogs: 'Blogs',
  featureArticles: 'Feature Articles',
  events: 'Past Events',
  about: 'About',
};

export const ALL_FEATURE_KEYS: FeatureKey[] = ['manuscriptDescriptions'];

/**
 * English source of truth for the flag names, mirroring `SECTION_LABELS`. The
 * admin UI renders the localized `backoffice.siteFeatures.features.*` keys
 * (exactly as the section toggles render `…siteFeatures.sections.*`); these
 * constants keep a locale-independent name next to the key union, and
 * `site-features.test.ts` pins them to the English catalogue so the two copies
 * cannot drift.
 */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  manuscriptDescriptions: 'Manuscript descriptions (TEI msDesc)',
};

/** One-line "what does this flag actually hide" text, shown under each toggle. */
export const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  manuscriptDescriptions:
    'Structured TEI descriptions: the description section on public manuscript pages and the msDesc editor in the manuscript workspace. Nothing is deleted — turning this back on restores everything. Search facets are configured separately under Search Categories.',
};

/**
 * Fold an untrusted `features` object (parsed config file, or a PUT payload)
 * onto a base map: only known keys with boolean values are applied, so unknown
 * keys never reach disk and a malformed value can't turn a flag into a string.
 * Anything that isn't a plain object leaves `base` untouched — which is what
 * keeps an omitted `features` key (an older client, or a config file written
 * before the flag existed) from wiping the admin's choices.
 */
export function mergeFeatureFlags(
  base: Record<FeatureKey, boolean>,
  incoming: unknown
): Record<FeatureKey, boolean> {
  const merged = { ...base };
  if (incoming == null || typeof incoming !== 'object' || Array.isArray(incoming)) return merged;
  const source = incoming as Record<string, unknown>;
  for (const key of ALL_FEATURE_KEYS) {
    const value = source[key];
    if (typeof value === 'boolean') merged[key] = value;
  }
  return merged;
}

/**
 * Flags default to ON. A flag is introduced for a feature that already ships,
 * so the default has to reproduce today's behaviour exactly: the surface stays
 * visible on deploy (the persisted config has no `features` key yet) and only
 * disappears when an admin deliberately turns it off.
 */
export function getDefaultFeatures(): Record<FeatureKey, boolean> {
  return Object.fromEntries(ALL_FEATURE_KEYS.map((k) => [k, true])) as Record<FeatureKey, boolean>;
}

const THEME_COLOR_KEYS: (keyof ThemeColors)[] = [
  'primaryColor',
  'primaryForegroundColor',
  'accentColor',
  'titleBarBackgroundColor',
  'titleBarTextColor',
  'navBarBackgroundColor',
  'navBarTextColor',
];

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

// The hardcoded `:root` values in globals.css — the MoA look this app shipped
// with before any deployment or admin could change it. The two header rows
// default to the same primary/foreground pair, matching the single-colour
// header this app rendered before the rows could be repainted separately.
const ROOT_THEME_COLORS: ThemeColors = {
  primaryColor: '#075783',
  primaryForegroundColor: '#faf8f5',
  accentColor: '#f59f0a',
  titleBarBackgroundColor: '#075783',
  titleBarTextColor: '#faf8f5',
  navBarBackgroundColor: '#075783',
  navBarTextColor: '#faf8f5',
};

/**
 * The theme an admin sees the first time they open `UI customization` — before
 * they've saved anything, or on a deployment whose backend predates this
 * field. It has to reproduce today's rendered colours exactly (same
 * backward-compat rule as `getDefaultFeatures`), which for a non-`moa`
 * deployment means the build-time `NEXT_PUBLIC_SITE_THEME` preset it already
 * renders with (`lib/site-theme.ts`), not the MoA blue. Once an admin saves a
 * theme here, this per-deployment default no longer matters for that
 * deployment: the persisted value always wins.
 */
export function getDefaultThemeColors(): ThemeColors {
  const overrides = getSiteThemeVars();
  const fromOverride = (cssVar: string, fallback: string) => {
    const raw = overrides[cssVar];
    return (raw && siteThemeVarToHex(raw)) || fallback;
  };
  const primaryColor = fromOverride('--primary', ROOT_THEME_COLORS.primaryColor);
  // No preset overrides the foreground colour drawn on top of --primary.
  const primaryForegroundColor = ROOT_THEME_COLORS.primaryForegroundColor;
  return {
    primaryColor,
    primaryForegroundColor,
    accentColor: fromOverride('--accent', ROOT_THEME_COLORS.accentColor),
    // Both header rows default to the deployment's brand primary/foreground —
    // the single-colour look this app rendered before the rows could be
    // repainted independently (archetype-pal/frontend#103).
    titleBarBackgroundColor: primaryColor,
    titleBarTextColor: primaryForegroundColor,
    navBarBackgroundColor: primaryColor,
    navBarTextColor: primaryForegroundColor,
  };
}

/**
 * Fold an untrusted `theme` object onto a base palette: only known keys with a
 * valid `#rrggbb` value are applied, mirroring `mergeFeatureFlags` — an
 * omitted or malformed value keeps `base` untouched instead of turning a
 * brand colour into `undefined` or an unparsable string.
 */
export function mergeThemeColors(base: ThemeColors, incoming: unknown): ThemeColors {
  const merged = { ...base };
  if (incoming == null || typeof incoming !== 'object' || Array.isArray(incoming)) return merged;
  const source = incoming as Record<string, unknown>;
  for (const key of THEME_COLOR_KEYS) {
    const value = source[key];
    if (typeof value === 'string' && HEX_COLOR_RE.test(value)) merged[key] = value;
  }
  return merged;
}

/** No logo until an admin sets one — the header renders the site title alone, same as today. */
export function getDefaultBranding(): BrandingConfig {
  return { logoUrl: '' };
}

/**
 * Fold an untrusted `branding` object onto a base value, mirroring
 * `mergeThemeColors`: only a string `logoUrl` is applied, so an omitted or
 * malformed value keeps `base` untouched rather than clearing the logo.
 */
export function mergeBranding(base: BrandingConfig, incoming: unknown): BrandingConfig {
  const merged = { ...base };
  if (incoming == null || typeof incoming !== 'object' || Array.isArray(incoming)) return merged;
  const source = incoming as Record<string, unknown>;
  if (typeof source.logoUrl === 'string') merged.logoUrl = source.logoUrl.trim();
  return merged;
}

export function normalizeSectionOrder(order: readonly SectionKey[] | undefined): SectionKey[] {
  const ordered: SectionKey[] = [];
  const seen = new Set<SectionKey>();

  for (const key of order ?? []) {
    if (ALL_SECTION_KEYS.includes(key) && !seen.has(key)) {
      ordered.push(key);
      seen.add(key);
    }
  }

  for (const key of ALL_SECTION_KEYS) {
    if (!seen.has(key)) {
      ordered.push(key);
    }
  }

  return ordered;
}

const DEFAULT_COLUMNS: Record<ResultType, string[]> = Object.fromEntries(
  SEARCH_RESULT_TYPES.map((type) => [type, [...getDefaultVisibleColumns(type)]])
) as Record<ResultType, string[]>;

export { DEFAULT_COLUMNS };

export function getDefaultConfig(): SiteFeaturesConfig {
  const sections = Object.fromEntries(ALL_SECTION_KEYS.map((k) => [k, true])) as Record<
    SectionKey,
    boolean
  >;

  const searchCategories = Object.fromEntries(
    SEARCH_RESULT_TYPES.map((type) => [
      type,
      {
        enabled: true,
        visibleColumns: [...DEFAULT_COLUMNS[type]],
        visibleFacets: [...getFacetOrder(type)],
      },
    ])
  ) as Record<ResultType, SearchCategoryConfig>;

  return {
    sections,
    sectionOrder: [...ALL_SECTION_KEYS],
    features: getDefaultFeatures(),
    searchCategories,
    theme: getDefaultThemeColors(),
    branding: getDefaultBranding(),
  };
}
